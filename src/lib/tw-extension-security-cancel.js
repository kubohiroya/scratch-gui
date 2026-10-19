import {cancelSecurityLoad} from '../reducers/project-state';
import {setProjectTitle} from '../reducers/project-title';
import {setFileHandle} from '../reducers/tw';
import {closeLoadingProject} from '../reducers/modals';
import {closeFileMenu} from '../reducers/menus';
import {setPlayer, setFullScreen} from '../reducers/mode';

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

export default returnToEditorStart;
