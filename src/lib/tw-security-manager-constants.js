import {getHostIntegration} from '../addons/hooks.js';

const defaults = {
    LoadExtension: 'LoadExtension',
    LoadExtensions: 'LoadExtensions',
    Fetch: 'Fetch',
    OpenWindow: 'OpenWindow',
    Redirect: 'Redirect',
    RecordAudio: 'RecordAudio',
    RecordVideo: 'RecordVideo',
    ReadClipboard: 'ReadClipboard',
    Notify: 'Notify',
    Geolocate: 'Geolocate',
    Embed: 'Embed',
    Download: 'Download'
};
const SecurityModals = getHostIntegration()?.withHostSecurityModals?.(
    defaults, getHostIntegration()?.hostIntegration?.()) || defaults;

export default SecurityModals;
