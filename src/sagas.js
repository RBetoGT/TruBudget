import { put, takeEvery, takeLatest } from 'redux-saga/effects'

import {
  fetchPeers,
  fetchProjects,
  fetchProjectDetails,
  postSubProject,
  postProject,
  fetchNodeInformation,
  fetchNotifications,
  markNotificationAsRead,
  fetchWorkflowItems,
  postWorkflowItem,
  editWorkflowItem,
  fetchUsers,
  fetchRoles,
  login,
  fetchStreamNames,
  fetchHistory
} from './api.js';

import { FETCH_PEERS, FETCH_PEERS_SUCCESS, FETCH_STREAM_NAMES, FETCH_STREAM_NAMES_SUCCESS } from './pages/Navbar/actions';
import { FETCH_PROJECTS, FETCH_PROJECTS_SUCCESS, CREATE_PROJECT, CREATE_PROJECT_SUCCESS } from './pages/Overview/actions';
import { FETCH_PROJECT_DETAILS, FETCH_PROJECT_DETAILS_SUCCESS, CREATE_SUBPROJECT_ITEM, CREATE_SUBPROJECT_ITEM_SUCCESS } from './pages/ProjectDetails/SubProjects/actions';
import { FETCH_NODE_INFORMATION, FETCH_NODE_INFORMATION_SUCCESS } from './pages/Dashboard/actions';
import { FETCH_NOTIFICATIONS, FETCH_NOTIFICATIONS_SUCCESS, MARK_NOTIFICATION_AS_READ, MARK_NOTIFICATION_AS_READ_SUCCESS } from './pages/Notifications/actions';
import { FETCH_WORKFLOW_ITEMS, FETCH_WORKFLOW_ITEMS_SUCCESS, CREATE_WORKFLOW, EDIT_WORKFLOW, CREATE_WORKFLOW_SUCCESS, EDIT_WORKFLOW_SUCCESS, FETCH_HISTORY_SUCCESS, FETCH_HISTORY } from './pages/Workflows/actions';
import { FETCH_USERS, FETCH_USERS_SUCCESS, FETCH_ROLES, FETCH_ROLES_SUCCESS, LOGIN, LOGIN_SUCCESS } from './pages/Login/actions';

export function* fetchPeersSaga(action) {
  const peers = yield fetchPeers();
  yield put({ type: FETCH_PEERS_SUCCESS, peers: peers.data });
}

export function* fetchProjectDetailsSaga(action) {
  const projectDetails = yield fetchProjectDetails(action.project);

  yield put({ type: FETCH_PROJECT_DETAILS_SUCCESS, projectDetails: projectDetails.data });
}

export function* fetchProjectsSaga() {
  const projects = yield fetchProjects();
  yield put({ type: FETCH_PROJECTS_SUCCESS, projects: projects.data });
}

export function* fetchWorkflowItemsSaga(action) {
  const workflowItems = yield fetchWorkflowItems(action.streamName);
  yield put({ type: FETCH_WORKFLOW_ITEMS_SUCCESS, workflowItems: workflowItems.data })
}

export function* createProject(action) {
  yield postProject(action.name, action.amount, action.purpose, action.currency, action.approver, action.assignee, action.bank);
  yield put({ type: CREATE_PROJECT_SUCCESS });
  yield put({ type: FETCH_PROJECTS });
}
export function* createSubProjectSaga(action) {
  yield postSubProject(action.parentName, action.subProjectName, action.subProjectAmount, action.subProjectPurpose, action.subProjectCurrency);
  yield put({ type: CREATE_SUBPROJECT_ITEM_SUCCESS });
  yield put({ type: FETCH_PROJECT_DETAILS, project: action.parentName });
}

export function* createWorkflowItemSaga(action) {
  yield postWorkflowItem(action.stream, action.workflowName, action.amount, action.currency, action.purpose, action.addData, action.state, action.assignee);
  yield put({ type: CREATE_WORKFLOW_SUCCESS });
  yield put({ type: FETCH_WORKFLOW_ITEMS, streamName: action.stream });
}

export function* editWorkflowItemSaga(action) {
  yield editWorkflowItem(action.stream, action.workflowName, action.amount, action.currency, action.purpose, action.addData, action.state, action.assignee, action.txid, action.previousState);
  yield put({ type: EDIT_WORKFLOW_SUCCESS });
  yield put({ type: FETCH_WORKFLOW_ITEMS, streamName: action.stream });
}

export function* fetchNodeInformationSaga() {
  const nodeInformation = yield fetchNodeInformation()
  yield put({ type: FETCH_NODE_INFORMATION_SUCCESS, nodeInformation: nodeInformation.data });
}

export function* fetchNotificationSaga({ user }) {
  const notifications = yield fetchNotifications(user)
  yield put({ type: FETCH_NOTIFICATIONS_SUCCESS, notifications: notifications.data })
}

export function* markNotificationAsReadSaga({ user, id, data }) {
  yield markNotificationAsRead(user, id, data);
  yield put({ type: MARK_NOTIFICATION_AS_READ_SUCCESS });
  yield put({ type: FETCH_NOTIFICATIONS, user });
}

export function* fetchUsersSaga() {
  const users = yield fetchUsers();
  yield put({ type: FETCH_USERS_SUCCESS, users: users.data })
}

export function* fetchRolesSaga() {
  const roles = yield fetchRoles();
  yield put({ type: FETCH_ROLES_SUCCESS, roles: roles.data })
}

export function* loginSaga({ user }) {
  yield login(user.username, user.password);
  yield put({ type: LOGIN_SUCCESS, user })
}

export function* fetchStreamNamesSaga() {
  const streamNames = yield fetchStreamNames();
  yield put({ type: FETCH_STREAM_NAMES_SUCCESS, streamNames: streamNames.data })
}
export function* fetchHistorySaga({ project }) {
  const history = yield fetchHistory(project);
  yield put({ type: FETCH_HISTORY_SUCCESS, historyItems: history.data })
}

export function* watchFetchPeers() {
  yield takeEvery(FETCH_PEERS, fetchPeersSaga)
}

export function* watchFetchProjects() {
  yield takeEvery(FETCH_PROJECTS, fetchProjectsSaga)
}

export function* watchFetchProjectDetails() {
  yield takeEvery(FETCH_PROJECT_DETAILS, fetchProjectDetailsSaga)
}

export function* watchFetchWorkflowItems() {
  yield takeEvery(FETCH_WORKFLOW_ITEMS, fetchWorkflowItemsSaga)
}

export function* watchFetchHistory() {
  yield takeEvery(FETCH_HISTORY, fetchHistorySaga)
}

export function* watchCreateSubProject() {
  yield takeEvery(CREATE_SUBPROJECT_ITEM, createSubProjectSaga)
}

export function* watchCreateWorkflowItem() {
  yield takeEvery(CREATE_WORKFLOW, createWorkflowItemSaga)
}

export function* watchEditWorkflowItem() {
  yield takeEvery(EDIT_WORKFLOW, editWorkflowItemSaga)
}

export function* watchCreateProject() {
  yield takeEvery(CREATE_PROJECT, createProject)
}

export function* watchFetchNodeInformation() {
  yield takeEvery(FETCH_NODE_INFORMATION, fetchNodeInformationSaga)
}

export function* watchFetchNotifications() {
  yield takeLatest(FETCH_NOTIFICATIONS, fetchNotificationSaga)
}

export function* watchMarkNotificationAsRead() {
  yield takeLatest(MARK_NOTIFICATION_AS_READ, markNotificationAsReadSaga)
}

export function* watchFetchUsers() {
  yield takeLatest(FETCH_USERS, fetchUsersSaga)
}

export function* watchFetchRoles() {
  yield takeLatest(FETCH_ROLES, fetchRolesSaga)
}

export function* watchLogin() {
  yield takeLatest(LOGIN, loginSaga)
}

export function* watchFetchStreamNames() {
  yield takeLatest(FETCH_STREAM_NAMES, fetchStreamNamesSaga)
}

export default function* rootSaga() {
  yield [
    watchFetchPeers(),
    watchFetchProjects(),
    watchFetchProjectDetails(),
    watchCreateSubProject(),
    watchCreateWorkflowItem(),
    watchEditWorkflowItem(),
    watchCreateProject(),
    watchFetchNodeInformation(),
    watchFetchNotifications(),
    watchMarkNotificationAsRead(),
    watchFetchWorkflowItems(),
    watchFetchUsers(),
    watchFetchRoles(),
    watchLogin(),
    watchFetchStreamNames(),
    watchFetchHistory()
  ]
}
