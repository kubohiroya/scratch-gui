import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import Modal from './modal.jsx';
import log from '../lib/log.js';
import {hostBlockEditor, hostIntegration} from '../lib/tw-plus-integration-points.js';

const reportError = error => log.error(error);

const BlockEditorModal = ({intl, nodeAppearances, nodeLabels, onClose, session}) =>
    hostBlockEditor(hostIntegration())?.render({
        intl,
        nodeAppearances,
        nodeLabels,
        onClose,
        session,
        ModalComponent: Modal,
        onError: reportError
    }) || null;

BlockEditorModal.propTypes = {
    nodeAppearances: PropTypes.object,
    nodeLabels: PropTypes.object,
    intl: intlShape,
    onClose: PropTypes.func.isRequired,
    session: PropTypes.object.isRequired
};

export {BlockEditorModal};
export default injectIntl(BlockEditorModal);
