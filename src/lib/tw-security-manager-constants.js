import {hostIntegration, withHostSecurityModals} from './tw-plus-integration-points.js';

const SecurityModals = withHostSecurityModals({
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
}, hostIntegration());

export default SecurityModals;
