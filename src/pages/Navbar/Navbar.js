import React from 'react';
import AppBar from 'material-ui/AppBar';

import SideNav from './SideNav';
import PeerInfoIcon from './PeerInfoIcon';

const Navbar = ({ onToggleSidebar, peers, showSidebar, history }) => (
  <div>
    <AppBar
      title="ACMECorp Chain"
      onLeftIconButtonTouchTap={onToggleSidebar}
      iconElementRight={<PeerInfoIcon peers={peers} />}
      style={{
        height: '500px',
        backgroundImage: 'url("/navbar_back3.jpg")',
        backgroundSize: 'cover'
      }}
    />
    <SideNav
      onToggleSidebar={onToggleSidebar}
      showSidebar={showSidebar}
      history={history} />
  </div>
);

export default Navbar;
