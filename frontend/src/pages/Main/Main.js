import React, { Component, useEffect } from "react";
import { connect } from "react-redux";
import { Navigate, Route, Routes } from "react-router-dom";

import { TourAppProvider } from "../../context/tour";
import ScrollTop from "../Common/ScrollTop";
import ConfirmationContainer from "../Confirmation/ConfirmationContainer";
import NotFound from "../Error/NotFound";
import withInitialLoading from "../Loading/withInitialLoading";
import { initLanguage, refreshToken } from "../Login/actions";
import Breadcrumbs from "../Navbar/Breadcrumbs";
import NavbarContainer from "../Navbar/NavbarContainer";
import NodesContainer from "../Nodes/NodesContainer";
import NotificationPageContainer from "../Notifications/NotificationPageContainer";
import OverviewContainer from "../Overview/OverviewContainer";
import StatusContainer from "../Status/StatusContainer";
import SubProjectContainer from "../SubProjects/SubProjectContainer";
import UserManagementContainer from "../Users/UserManagementContainer";
import WorkflowContainer from "../Workflows/WorkflowContainer";

import Footer from "./Footer";
import TourWrapper from "./TourWrapper";

import "./Main.scss";

const SubprojectElement = withInitialLoading(WorkflowContainer);
const ProjectsElement = withInitialLoading(OverviewContainer);
const ProjectElement = withInitialLoading(SubProjectContainer);
const NotificationsElement = withInitialLoading(NotificationPageContainer);

const verifyTokenExpiration = () => {
  const exp = parseInt(localStorage.getItem("access_token_exp"));
  const now = new Date();

  return exp && now.getTime() > exp;
};

let refreshTokenCheckInterval = null;

const Main = ({ refreshToken, window }) => {
  // recuring check for access token validity
  useEffect(() => {
    refreshTokenCheckInterval = setInterval(() => {
      if (verifyTokenExpiration()) {
        refreshToken();
      }
    }, 5000);
  }, [refreshToken]);

  useEffect(() => {
    return () => {
      if (refreshTokenCheckInterval) {
        clearInterval(refreshTokenCheckInterval);
        refreshTokenCheckInterval = null;
      }
    };
  }, []);

  return (
    <div className="main">
      <TourAppProvider>
        <div className="main-nav">
          <NavbarContainer />
        </div>
        <div className="main-container">
          <TourWrapper />
          <Breadcrumbs />
          <ConfirmationContainer />
          <Routes>
            <Route exact path="/" element={<Navigate to="/projects" replace />} />
            <Route exact path="/projects/:project/:subproject" element={<SubprojectElement />} />
            <Route exact path="/projects" element={<ProjectsElement />} />
            <Route exact path="/projects/:project" element={<ProjectElement />} />
            <Route exact path="/notifications" element={<NotificationsElement />} />
            <Route exact path="/users" element={<UserManagementContainer />} />
            <Route exact path="/nodes" element={<NodesContainer />} />
            <Route exact path="/status" element={<StatusContainer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ScrollTop window={window} />
          <Footer />
        </div>
      </TourAppProvider>
    </div>
  );
};

class MainContainer extends Component {
  componentDidMount() {
    this.props.initLanguage();
  }

  render() {
    return <Main refreshToken={this.props.refreshToken} />;
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    initLanguage: () => dispatch(initLanguage()),
    refreshToken: () => dispatch(refreshToken())
  };
};

export default connect(null, mapDispatchToProps)(MainContainer);
