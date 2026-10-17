import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {BlockEditorConflictError} from '@kubohiroya/turbowarp-block-editor';
import Modal from './modal.jsx';
import log from '../lib/log.js';
import styles from '../components/block-editor/block-editor.css';

class BlockEditorModal extends React.Component {
    constructor (props) {
        super(props);
        this.state = {...props.session.getState(), mountFailed: false};
        this.handleClose = this.handleClose.bind(this);
        this.handleSave = this.handleSave.bind(this);
        this.handleBody = this.handleBody.bind(this);
        this.handleKey = this.handleKey.bind(this);
        this.handleComposition = this.handleComposition.bind(this);
        this.composing = false;
    }
    componentDidMount () {
        this.mounted = true;
        this.removeListener = this.props.session.subscribe(() => {
            const state = this.props.session.getState();
            this.setState(state);
            if (state.status === 'cancelled' || state.status === 'disposed') this.props.onClose();
        });
        this.mountBody();
    }
    componentWillUnmount () {
        this.mounted = false;
        cancelAnimationFrame(this.focusFrame);
        this.removeListener();
        try {
            if (this.unmountBody) this.unmountBody();
        } catch (error) {
            log.error(error);
        } finally {
            this.props.session.dispose();
        }
    }
    handleBody (body) {
        this.body = body;
        if (this.mounted) this.mountBody();
    }
    mountBody () {
        // ReactModal renders portal contents after this container has mounted.
        if (!this.body || this.unmountBody || this.state.mountFailed) return;
        try {
            this.unmountBody = this.props.session.mount(this.body);
            // ReactModal establishes its focus scope after creating the portal.
            this.focusFrame = requestAnimationFrame(() => {
                if (!this.mounted) return;
                const first = this.body.querySelector('input, textarea, select, button, [tabindex="0"]');
                if (first) first.focus();
            });
        } catch (error) {
            log.error(error);
            this.setState({mountFailed: true});
        }
    }
    handleComposition (event) {
        this.composing = event.type === 'compositionstart';
    }
    handleKey (event) {
        if (this.composing || event.nativeEvent.isComposing || event.keyCode === 229) {
            // Let the IME consume Enter/Escape without reaching the modal's close handler.
            event.stopPropagation();
        }
    }
    handleClose () {
        // All close paths share the same refusal while saving.
        if (this.props.session.cancel()) return;
        if (this.props.session.getState().status !== 'saving') this.props.onClose();
    }
    async handleSave () {
        const result = await this.props.session.save();
        if (result.status === 'saved') this.props.onClose();
    }
    render () {
        const saving = this.state.status === 'saving';
        const title = this.props.intl.formatMessage({
            id: 'tw.blockEditor.title', defaultMessage: 'Edit block', description: 'Block editor dialog title'
        });
        return (
            <Modal
                className={styles.modalContent}
                contentLabel={title}
                id="blockEditorModal"
                onRequestClose={this.handleClose}
            >
                <div
                    aria-busy={saving}
                    className={styles.body}
                    onCompositionEnd={this.handleComposition}
                    onCompositionStart={this.handleComposition}
                    onKeyDownCapture={this.handleKey}
                >
                    <div className={styles.editorBody}>
                        <div ref={this.handleBody} />
                        <div
                            aria-live="polite"
                            className={styles.errors}
                            role="status"
                        >
                            {saving ? <FormattedMessage
                                defaultMessage="Saving…"
                                description="Block editor validation or save is pending"
                                id="tw.blockEditor.saving"
                            /> : null}
                            {this.state.issues.map((issue, index) => <p key={index}>{issue.message}</p>)}
                            {this.state.error instanceof BlockEditorConflictError ? (
                                <FormattedMessage
                                    defaultMessage="This block changed. Close this dialog and open it again."
                                    description="Block editor conflict message"
                                    id="tw.blockEditor.conflict"
                                />
                            ) : (this.state.error || this.state.mountFailed) ? (
                                <FormattedMessage
                                    defaultMessage="The block could not be edited. Close this dialog and try again."
                                    description="Block editor failure message"
                                    id="tw.blockEditor.failed"
                                />
                            ) : null}
                        </div>
                    </div>
                    <div className={styles.buttons}>
                        <button
                            disabled={saving}
                            type="button"
                            onClick={this.handleClose}
                        >
                            <FormattedMessage
                                defaultMessage="Cancel"
                                description="Cancel block editing"
                                id="tw.blockEditor.cancel"
                            />
                        </button>
                        <button
                            data-block-editor-save
                            disabled={!this.state.canSave || this.state.mountFailed}
                            type="button"
                            onClick={this.handleSave}
                        >
                            {saving ? <FormattedMessage
                                defaultMessage="Saving…"
                                description="Block editor validation or save is pending"
                                id="tw.blockEditor.saving"
                            /> : <FormattedMessage
                                defaultMessage="Save"
                                description="Save block editing"
                                id="tw.blockEditor.save"
                            />}
                        </button>
                    </div>
                </div>
            </Modal>
        );
    }
}

BlockEditorModal.propTypes = {
    intl: intlShape,
    onClose: PropTypes.func.isRequired,
    session: PropTypes.shape({
        getState: PropTypes.func.isRequired,
        subscribe: PropTypes.func.isRequired,
        mount: PropTypes.func.isRequired,
        dispose: PropTypes.func.isRequired,
        save: PropTypes.func.isRequired,
        cancel: PropTypes.func.isRequired
    }).isRequired
};

export {BlockEditorModal};
export default injectIntl(BlockEditorModal);
