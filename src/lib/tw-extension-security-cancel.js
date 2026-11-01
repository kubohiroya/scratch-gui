import {cancelSecurityLoad} from '../reducers/project-state';
import {setProjectTitle} from '../reducers/project-title';
import {setFileHandle, setProjectError} from '../reducers/tw';
import {closeLoadingProject, openInvalidProjectModal} from '../reducers/modals';
import {closeFileMenu} from '../reducers/menus';
import {setPlayer, setFullScreen} from '../reducers/mode';
import {describeExtensionLoadFailure} from './tw-plus-extension-load-failure';

const returnToEditorStart = dispatch => {
    // Remove the startup override before the default-project fetch is dispatched.
    // Otherwise ?project_url=... would immediately load the cancelled project again.
    const url = new URL(window.location.href);
    url.searchParams.delete('project_url');
    url.searchParams.delete('token');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    dispatch(closeLoadingProject());
    dispatch(closeFileMenu());
    dispatch(setProjectTitle(''));
    dispatch(setFileHandle(null));
    dispatch(setPlayer(false));
    dispatch(setFullScreen(false));
    dispatch(cancelSecurityLoad());
};

// An extension that cannot load ends the open like a cancellation, and the error dialog names it.
const returnToEditorStartAfterExtensionFailure = (dispatch, error) => {
    returnToEditorStart(dispatch);
    dispatch(setProjectError(describeExtensionLoadFailure(error)));
    dispatch(openInvalidProjectModal());
};

export {
    returnToEditorStart as default,
    returnToEditorStartAfterExtensionFailure
};
