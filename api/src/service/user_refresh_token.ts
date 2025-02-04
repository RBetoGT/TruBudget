import { VError } from "verror";

import { globalIntents } from "../authz/intents";
import { config } from "../config";
import { Ctx } from "../lib/ctx";
import DbConnector from "../lib/db";
import { kvStore } from "../lib/keyValueStore";
import logger from "../lib/logger";
import * as SymmetricCrypto from "../lib/symmetricCrypto";
import { verifyToken } from "../lib/token";
import { getOrganizationAddress } from "../organization/organization";
import * as Result from "../result";

import { NotAuthorized } from "./domain/errors/not_authorized";
import { NotFound } from "./domain/errors/not_found";
import { UserMetadata } from "./domain/metadata";
import * as AuthToken from "./domain/organization/auth_token";
import { getGroupsForUser } from "./domain/organization/group_query";
import * as UserQuery from "./domain/organization/user_query";
import { AuthenticationFailed } from "./errors/authentication_failed";
import { getselfaddress } from "./getselfaddress";
import { getGlobalPermissions } from "./global_permissions_get";
import { grantpermissiontoaddress } from "./grantpermissiontoaddress";
import { importprivkey } from "./importprivkey";
import { TokenBody } from "./user_authenticate";

import { ConnToken } from ".";

export interface UserLoginResponse {
  id: string;
  displayName: string;
  organization: string;
  allowedIntents: string[];
  groups: object[];
  token: string;
}

export async function validateRefreshToken(
  organization: string,
  organizationSecret: string,
  conn: ConnToken,
  dbConnection: DbConnector,
  ctx: Ctx,
  userId: string,
  refreshToken: string | undefined,
): Promise<Result.Type<AuthToken.AuthToken>> {
  logger.debug({ organization }, "Authenticating user by refresh token");
  let storedRefreshToken: { userId: string; validUntil: number } | undefined;

  if (config.refreshTokenStorage === "memory") {
    storedRefreshToken = kvStore.get(`refreshToken.${refreshToken}`) as
      | { userId: string; validUntil: number }
      | undefined;
  } else if (config.refreshTokenStorage === "db") {
    if (refreshToken) {
      storedRefreshToken = await dbConnection.getRefreshToken(refreshToken);
    }
    const now = new Date();
    if (!storedRefreshToken?.validUntil || now.getTime() > storedRefreshToken?.validUntil) {
      return new AuthenticationFailed({ ctx, organization, userId }, "Refresh token expired");
    }
  } else {
    return new VError("Unknown refresh storage type");
  }

  if (!storedRefreshToken || storedRefreshToken?.userId !== userId) {
    return new AuthenticationFailed({ ctx, organization, userId }, "No stored refresh token found");
  }

  // return user data

  // The special "root" user is not on the chain:
  if (userId === "root") {
    const tokenResult = await getRootUserAuthData(conn, ctx, organization);
    return Result.mapErr(tokenResult, (err) => new VError(err, "root authentication failed"));
  } else {
    const tokenResult = await getUserAuthData(conn, ctx, organization, organizationSecret, userId);
    return Result.mapErr(
      tokenResult,
      (err) => new VError(err, `authentication failed for ${userId}`),
    );
  }
}

async function getRootUserAuthData(
  conn: ConnToken,
  ctx: Ctx,
  organization: string,
): Promise<Result.Type<AuthToken.AuthToken>> {
  logger.debug("Authenticating Root user");

  if (typeof conn.multichainClient === "undefined") {
    logger.error("Received request, but MultiChain connection/permissions not ready yet.");
    return new AuthenticationFailed(
      { ctx, organization, userId: "root" },
      "Received request, but MultiChain connection/permissions not ready yet.",
    );
  }

  const organizationAddressResult = await getOrganizationAddressOrError(conn, ctx, organization);
  if (Result.isErr(organizationAddressResult)) {
    return new AuthenticationFailed({ ctx, organization, userId: "root" });
  }
  const organizationAddress = organizationAddressResult;
  const rootAddress =
    config.signingMethod === "user"
      ? await getselfaddress(conn.multichainClient)
      : organizationAddress;

  return {
    userId: "root",
    displayName: "root",
    address: rootAddress,
    groups: [],
    organization,
    organizationAddress,
    allowedIntents: globalIntents,
  };
}

export async function getUserAuthData(
  conn: ConnToken,
  ctx: Ctx,
  organization: string,
  organizationSecret: string,
  userId: string,
): Promise<Result.Type<AuthToken.AuthToken>> {
  // Use root as the service user to ensure we see all the data:
  const nodeAddress = await getselfaddress(conn.multichainClient);
  const rootUser = { id: "root", groups: [], address: nodeAddress };

  const userRecord = await UserQuery.getUser(conn, ctx, rootUser, userId);
  if (Result.isErr(userRecord)) {
    return new AuthenticationFailed({ ctx, organization, userId }, userRecord);
  }

  // Check if user has user.authenticate intent
  const canAuthenticate =
    userRecord?.permissions["user.authenticate"] &&
    userRecord?.permissions["user.authenticate"].some((id) => id === userId);

  if (!canAuthenticate) {
    return new NotAuthorized({ ctx, userId, intent: "user.authenticate" });
  }

  // Every user has an address and an associated private key. Importing the private key
  // when authenticating a user allows users to roam freely between nodes of their
  // organization.
  const privkey = SymmetricCrypto.decrypt(organizationSecret, userRecord.encryptedPrivKey);
  if (Result.isErr(privkey)) {
    const cause = new VError(
      privkey,
      "failed to decrypt the user's private key with the given organization secret " +
        `(does "${userId}" belong to "${organization}"?)`,
    );
    return new AuthenticationFailed({ ctx, organization, userId }, cause);
  }
  await importprivkey(conn.multichainClient, privkey, userRecord.id);
  if (config.signingMethod === "user") {
    const userAddressPermissions: string[] = ["send"];
    await grantpermissiontoaddress(
      conn.multichainClient,
      userRecord.address,
      userAddressPermissions,
    );
  }
  const authTokenResult = AuthToken.fromUserRecord(userRecord, {
    getGroupsForUser: async (id) => {
      const groupsResult = await getGroupsForUser(conn, ctx, rootUser, id);
      if (Result.isErr(groupsResult)) {
        return new VError(groupsResult, `fetch groups for user ${id} failed`);
      }
      return groupsResult.map((group) => group.id);
    },
    getOrganizationAddress: async (orga) => getOrganizationAddressOrError(conn, ctx, orga),
    getGlobalPermissions: async () => getGlobalPermissions(conn, ctx, rootUser),
  });

  return Result.mapErr(
    authTokenResult,
    (error) => new AuthenticationFailed({ ctx, organization, userId }, error),
  );
}

async function getOrganizationAddressOrError(
  conn: ConnToken,
  ctx: Ctx,
  organization: string,
): Promise<Result.Type<string>> {
  const organizationAddress = await getOrganizationAddress(conn.multichainClient, organization);
  if (!organizationAddress) {
    return new VError(
      { info: { ctx, organization } },
      `No organization address found for ${organization}`,
    );
  }
  return organizationAddress;
}

export async function authenticateWithToken(
  organization: string,
  organizationSecret: string,
  conn: ConnToken,
  ctx: Ctx,
  token: string,
  csrf: string,
): Promise<Result.Type<AuthToken.AuthToken>> {
  logger.debug({ organization }, "Authenticating user with token");
  // config check
  if (config.authProxy.enabled && !config.authProxy.jwsSignature) {
    const cause = new VError(
      `Environment variables not set correctly.\nconfig.authProxy.jwsSignature=${config.authProxy.jwsSignature}`,
    );
    return new AuthenticationFailed({ ctx, organization, userId: "" }, cause);
  }

  // check if external functional identity for user has been found
  const unverifiedBody64 = token.split(".")[1];
  const unverifiedBody = JSON.parse(Buffer.from(unverifiedBody64, "base64").toString());
  if (!unverifiedBody.sub || unverifiedBody.sub === "") {
    return new NotFound(ctx, "user", "");
  }

  let verifiedToken;
  try {
    if (!config.authProxy.jwsSignature) {
      return new VError("jwsSignature not set in authProxy config");
    }
    const base64SigningKey = config.authProxy.jwsSignature;
    verifiedToken = verifyToken(token, Buffer.from(base64SigningKey, "base64"), "RS256");
  } catch (err) {
    const cause = new VError(err, "There was a problem verifying the authorization token");
    return new AuthenticationFailed({ ctx, organization, userId: "" }, cause);
  }

  // extract id and metadata
  const body: TokenBody = verifiedToken?.body.toJSON();
  const userId = body?.sub;
  const metadata = body.metadata;
  const externalId = metadata.externalId || "";
  const kid = metadata.kid || "";
  const csrfFromCookie = body?.csrf;

  // cookie value does not match with value from http request params
  if (csrfFromCookie !== csrf) {
    return new NotAuthorized(
      { ctx, userId, intent: "user.authenticate" },
      new VError("CSRF protection"),
    );
  }

  // disable proxy login for "root"
  if (userId === "root") {
    return new NotAuthorized({ ctx, userId, intent: "user.authenticate" });
  }

  const userMetadata: UserMetadata = { externalId, kid };

  // Use root as the service user to ensure we see all the data:
  const nodeAddress = await getselfaddress(conn.multichainClient);
  const rootUser = { id: "root", groups: [], address: nodeAddress };

  const userRecord = await UserQuery.getUser(conn, ctx, rootUser, userId);
  if (Result.isErr(userRecord)) {
    return new AuthenticationFailed({ ctx, organization, userId }, userRecord);
  }

  // Check if user has user.authenticate intent
  const canAuthenticate =
    userRecord?.permissions["user.authenticate"] &&
    userRecord?.permissions["user.authenticate"].some((id) => id === userId);

  if (!canAuthenticate) {
    return new NotAuthorized({ ctx, userId, intent: "user.authenticate" });
  }

  // Every user has an address and an associated private key. Importing the private key
  // when authenticating a user allows users to roam freely between nodes of their
  // organization.
  const privkey = SymmetricCrypto.decrypt(organizationSecret, userRecord.encryptedPrivKey);
  if (Result.isErr(privkey)) {
    const cause = new VError(
      privkey,
      "failed to decrypt the user's private key with the given organization secret " +
        `(does "${userId}" belong to "${organization}"?)`,
    );
    return new AuthenticationFailed({ ctx, organization, userId }, cause);
  }
  await importprivkey(conn.multichainClient, privkey, userRecord.id);
  if (config.signingMethod === "user") {
    const userAddressPermissions: string[] = ["send"];
    await grantpermissiontoaddress(
      conn.multichainClient,
      userRecord.address,
      userAddressPermissions,
    );
  }
  const authTokenResult = AuthToken.fromUserRecord(
    userRecord,
    {
      getGroupsForUser: async (id) => {
        const groupsResult = await getGroupsForUser(conn, ctx, rootUser, id);
        if (Result.isErr(groupsResult)) {
          return new VError(groupsResult, `fetch groups for user ${id} failed`);
        }
        return groupsResult.map((group) => group.id);
      },
      getOrganizationAddress: async (orga) => getOrganizationAddressOrError(conn, ctx, orga),
      getGlobalPermissions: async () => getGlobalPermissions(conn, ctx, rootUser),
    },
    userMetadata,
  );

  return Result.mapErr(
    authTokenResult,
    (err) => new VError(err, `token authentication failed for ${userId}`),
  );
}
