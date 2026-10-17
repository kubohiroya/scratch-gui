import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {BlockEditorConflictError, BlockEditorStructureError} from '@kubohiroya/turbowarp-block-editor';
import DescendantTree from '../components/block-editor/descendant-tree.jsx';
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
        this.handleMountError = this.handleMountError.bind(this);
        this.handleIssue = this.handleIssue.bind(this);
        this.handleTree = this.handleTree.bind(this);
        this.composing = false;
    }
    componentDidMount () {
        this.mounted = true;
        this.removeListener = this.props.session.subscribe(() => {
            const state = this.props.session.getState();
            this.setState(state);
            if (['cancelled', 'disposed', 'invalidated'].includes(state.status)) this.props.onClose();
        });
        this.mountBody();
    }
    componentWillUnmount () {
        this.unmounting = true;
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
            if (typeof this.props.session.getNodes !== 'function') {
                this.unmountBody = this.props.session.mount(this.body);
            }
            // ReactModal establishes its focus scope after creating the portal.
            this.focusFrame = requestAnimationFrame(() => {
                if (!this.mounted) return;
                const first = this.body.querySelector('input, textarea, select') ||
                    this.body.querySelector('button, [tabindex="0"]');
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
    handleMountError (error) {
        log.error(error);
        if (!this.unmounting) this.setState({mountFailed: true});
    }
    handleIssue (event) {
        this.tree.reveal(this.state.issues[Number(event.currentTarget.dataset.blockEditorIssue)]);
    }
    handleTree (tree) {
        this.tree = tree;
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
        if (result.status === 'invalid' && this.tree) this.tree.reveal(result.issues[0]);
    }
    render () {
        const saving = this.state.status === 'saving';
        const hierarchy = typeof this.props.session.getNodes === 'function';
        const title = this.props.intl.formatMessage({
            id: 'tw.blockEditor.title', defaultMessage: 'Edit block', description: 'Block editor dialog title'
        });
        return (
            <Modal
                className={`${styles.modalContent} ${hierarchy ? styles.hierarchyModal : ''}`}
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
                        <div ref={this.handleBody}>
                            {hierarchy ? <DescendantTree
                                disabled={saving}
                                nodeAppearances={this.props.nodeAppearances}
                                nodeLabels={this.props.nodeLabels}
                                onError={this.handleMountError}
                                ref={this.handleTree}
                                session={this.props.session}
                            /> : null}
                        </div>
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
                            {this.state.issues.map((issue, index) => (hierarchy ? (
                                <button
                                    className={styles.nodeError}
                                    data-block-editor-issue={index}
                                    disabled={saving}
                                    key={index}
                                    type="button"
                                    onClick={this.handleIssue}
                                >
                                    {(this.props.nodeLabels && this.props.nodeLabels[issue.reference.blockId]) ||
                                        issue.reference.blockId}{': '}{issue.message}
                                </button>
                            ) : <p key={index}>{issue.message}</p>))}
                            {this.state.error instanceof BlockEditorStructureError ? (
                                <FormattedMessage
                                    defaultMessage={'This hierarchy is invalid or exceeds 500 blocks or 32 levels. ' +
                                        'No blocks were saved.'}
                                    description="A hierarchy cannot be opened safely"
                                    id="tw.blockEditor.structureError"
                                />
                            ) : this.state.error instanceof BlockEditorConflictError ? (
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
                            /> : hierarchy ? <FormattedMessage
                                defaultMessage="Save all"
                                description="Save all block forms in one transaction"
                                id="tw.blockEditor.saveAll"
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
    nodeAppearances: PropTypes.object,
    nodeLabels: PropTypes.object,
    intl: intlShape,
    onClose: PropTypes.func.isRequired,
    session: PropTypes.shape({
        getState: PropTypes.func.isRequired,
        subscribe: PropTypes.func.isRequired,
        mount: PropTypes.func,
        getNodes: PropTypes.func,
        dispose: PropTypes.func.isRequired,
        save: PropTypes.func.isRequired,
        cancel: PropTypes.func.isRequired
    }).isRequired
};

export {BlockEditorModal};
export default injectIntl(BlockEditorModal);
