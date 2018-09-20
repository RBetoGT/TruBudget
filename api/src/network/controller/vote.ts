import { throwIfUnauthorized } from "../../authz";
import Intent from "../../authz/intents";
import * as Global from "../../global";
import { AuthenticatedRequest, HttpResponse } from "../../httpd/lib";
import { isNonemptyString, value } from "../../lib/validation";
import { MultichainClient } from "../../multichain";
import * as AccessVote from "../model/AccessVote";
import * as Nodes from "../model/Nodes";

export async function voteForNetworkPermission(
  multichain: MultichainClient,
  req,
): Promise<HttpResponse> {
  // Permission check:
  const userIntent: Intent = "network.voteForPermission";
  await throwIfUnauthorized(req.user, userIntent, await Global.getPermissions(multichain));

  // Input validation:
  const input = value("data", req.body.data, x => x !== undefined);
  const targetAddress: Nodes.WalletAddress = value("address", input.address, isNonemptyString);
  const vote: AccessVote.t = value("vote", input.vote, AccessVote.isValid);

  // Grant or revoke? We need to find out our current vote to know..
  const callerAddress = req.user.organizationAddress;
  const currentVote = await getCurrentVote(multichain, callerAddress, targetAddress);

  const [operation, permissions] = computeWhatToDo(currentVote, vote);

  if (operation === "grant") {
    await Nodes.grant(multichain, callerAddress, targetAddress, permissions);
  } else if (operation === "revoke") {
    await Nodes.revoke(multichain, callerAddress, targetAddress, permissions);
  } else {
    // no action required
  }

  return [200, { apiVersion: "1.0", data: "OK" }];
}

export async function getCurrentVote(
  multichain: MultichainClient,
  callerAddress: Nodes.WalletAddress,
  targetAddress: Nodes.WalletAddress,
) {
  const noOrganizationLookup = new Map<Nodes.WalletAddress, Nodes.Organization>();
  const currentPermissions: Nodes.PermissionInfo[] = await Nodes.getNetworkPermissions(
    multichain,
    targetAddress,
    noOrganizationLookup,
  );

  const adminPermissionInfo = currentPermissions
    .filter(x => x.permission === "admin")
    .find(_ => true);
  const connectPermissionInfo = currentPermissions
    .filter(x => x.permission === "connect")
    .find(_ => true);

  const currentVote: AccessVote.t = hasApprover(adminPermissionInfo, callerAddress)
    ? "admin"
    : hasApprover(connectPermissionInfo, callerAddress)
      ? "basic"
      : "none";
  return currentVote;
}

function hasApprover(
  permissionInfo: Nodes.PermissionInfo | undefined,
  maybeApprover: Nodes.WalletAddress,
): boolean {
  if (permissionInfo === undefined) return false;
  return permissionInfo.approvedBy.map(x => x.address).includes(maybeApprover);
}

function computeWhatToDo(
  current: AccessVote.t,
  next: AccessVote.t,
): ["grant" | "revoke" | "no action", Nodes.NetworkPermission[]] {
  // Makes it easier to read:
  const allPermissions = AccessVote.adminPermissions;

  if (current === "admin") {
    if (next === "admin") return ["no action", []];
    if (next === "basic") return ["revoke", AccessVote.exclusiveAdminPermissions];
    if (next === "none") return ["revoke", allPermissions];
  } else if (current === "basic") {
    if (next === "admin") return ["grant", allPermissions];
    if (next === "basic") return ["no action", []];
    if (next === "none") return ["revoke", allPermissions];
  } else if (current === "none") {
    if (next === "admin") return ["grant", allPermissions];
    if (next === "basic") return ["grant", AccessVote.basicPermissions];
    if (next === "none") return ["no action", []];
  }

  throw Error("non-exhaustive switch");
}
