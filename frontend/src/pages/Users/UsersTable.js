import React from "react";
import Table from "@material-ui/core/Table";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import TableCell from "@material-ui/core/TableCell";
import TableBody from "@material-ui/core/TableBody";
import Paper from "@material-ui/core/Paper";
import _sortBy from "lodash/sortBy";
import blueGrey from "@material-ui/core/colors/blueGrey";

import strings from "../../localizeStrings";
import { withStyles } from "@material-ui/core";

const styles = {
  paper: {
    marginTop: "40px"
  },
  title: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    height: "50px",
    alignItems: "center",
    backgroundColor: blueGrey[50]
  }
};
const sortUsers = users => {
  return _sortBy(users, user => user.organization && user.id);
};

const UsersTable = ({ users, classes }) => {
  const sortedUsers = sortUsers(users.filter(u => u.isGroup !== true));
  return (
    <Paper>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{strings.common.id}</TableCell>
            <TableCell>{strings.common.name}</TableCell>
            <TableCell>{strings.usersDashboard.organization}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody id="usertablebody">
          {sortedUsers.map(user => {
            return (
              <TableRow id={`user-${user.id}`} key={user.id}>
                <TableCell component="th" scope="row">
                  <span>{user.id}</span>
                </TableCell>
                <TableCell>
                  <span>{user.displayName}</span>
                </TableCell>
                <TableCell>
                  <span>{user.organization}</span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
};
export default withStyles(styles)(UsersTable);
