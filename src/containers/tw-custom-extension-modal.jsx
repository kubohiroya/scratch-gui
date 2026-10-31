import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';
import log from '../lib/log';
import CustomExtensionModalComponent from '../components/tw-custom-extension-modal/custom-extension-modal.jsx';
import {closeCustomExtensionModal} from '../reducers/modals';
import {manuallyTrustExtension, isTrustedExtension} from './tw-security-manager.jsx';
import {getExtensionAuthoringHost} from '../lib/tw-plus-extension-authoring.js';
import AuthoringSettings from '../components/tw-custom-extension-modal/authoring-settings.jsx';
import {getPersistedUnsandboxed, setPersistedUnsandboxed} from '../lib/tw-persisted-unsandboxed.js';

/**
 * @param {Blob} blob Blob
 * @returns {Promise<string>} data: uri
 */
const readAsDataURL = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Could not read extension as data URL: ${reader.error}`));
    reader.readAsDataURL(blob);
});

class CustomExtensionModal extends React.Component {
    constructor (props) {
        super(props);

        bindAll(this, [
            'handleChangeFiles',
            'handleChangeURL',
            'handleClose',
            'handleKeyDown',
            'handleLoadExtension',
            'handleSwitchToFile',
            'handleSwitchToURL',
            'handleSwitchToText',
            'handleChangeText',
            'handleDragOver',
            'handleDragLeave',
            'handleDrop',
            'handleChangeUnsandboxed',
            'handleBack',
            'handleChangeId',
            'handleChangeDistribution',
            'handleChangeExecution',
            'handleAddVerified'
        ]);

        this.authoring = getExtensionAuthoringHost(props.vm);
        this.state = {
            step: 'input',
            id: '',
            fileIds: [],
            distribution: 'embedded',
            execution: 'sandboxed',
            busy: false,
            status: '',
            recoveryURL: null,
            type: 'url',
            url: '',
            files: null,
            text: '',
            unsandboxed: getPersistedUnsandboxed()
        };
    }

    componentDidMount () {
        this.unsubscribe = this.authoring?.onDispose(this.handleClose);
    }

    componentWillUnmount () {
        this.unmounted = true;
        this.operation?.abort();
        this.unsubscribe?.();
        if (this.recoveryURL) URL.revokeObjectURL(this.recoveryURL);
    }

    handleBack () {
        if (!this.operation) this.setState({step: 'input'});
    }

    handleChangeId (event) {
        const index = Number(event.target.dataset.sourceIndex);
        const value = event.target.value;
        if (this.state.type === 'file') {
            this.setState(state => ({fileIds: state.fileIds.map((id, i) => (i === index ? value : id))}));
        } else this.setState({id: value});
    }

    handleChangeDistribution (event) {
        this.setState({distribution: event.target.value});
    }

    handleChangeExecution (event) {
        this.setState({execution: event.target.value});
    }

    getSources () {
        if (this.state.type === 'file') return Array.from(this.state.files || []);
        return [{name: this.state.type === 'url' ? this.state.url :
            (this.props.locale.startsWith('ja') ? '入力したJS' : 'JavaScript source')}];
    }

    async handleAddVerified (event) {
        event.preventDefault();
        if (this.operation || !this.hasValidInput()) return;
        const operation = new AbortController();
        this.operation = operation;
        const ja = this.props.locale.startsWith('ja');
        this.setState({busy: true,
            status: ja ? '内容を検証しています。実行許可を確認してください。' :
                'Verifying the source. Review the execution permission.'});
        try {
            const requests = this.getSources().map((source, index) => ({
                id: (this.state.type === 'file' ? this.state.fileIds[index] : this.state.id).trim(),
                execution: this.state.execution,
                distribution: this.state.type === 'url' ? this.state.distribution : 'embedded',
                ...(this.state.type === 'url' ? {url: this.state.url.trim()} :
                    {bytes: this.state.type === 'file' ? source :
                        new Blob([this.state.text], {type: 'text/javascript'})})
            }));
            await this.authoring.addCustom(requests, {signal: operation.signal});
            if (this.unmounted || operation.signal.aborted) return;
            this.props.vm.emit('PLUS_EXTENSION_CATEGORY_SELECTED', requests[requests.length - 1].id);
            this.handleClose();
        } catch (error) {
            if (this.unmounted || operation.signal.aborted) return;
            if (error.originalProject) {
                if (this.recoveryURL) URL.revokeObjectURL(this.recoveryURL);
                this.recoveryURL = URL.createObjectURL(new Blob([error.originalProject],
                    {type: 'application/x.scratch.sb3'}));
            }
            this.setState({step: 'input',
                recoveryURL: this.recoveryURL,
                status: `${ja ? '追加できませんでした。入力内容を確認して再度お試しください。' :
                    'Could not add the extension. Check the input and try again.'}
                    ${error.code || ''}: ${error.message}`});
        } finally {
            this.operation = null;
            if (!this.unmounted) this.setState({busy: false});
        }
    }

    /**
     * @returns {Promise<string[]>} List of extension URLs to load.
     */
    getExtensionURLs () {
        if (this.state.type === 'url') {
            return Promise.resolve([
                this.state.url
            ]);
        }

        if (this.state.type === 'file') {
            const files = Array.from(this.state.files);
            return Promise.all(files.map(readAsDataURL));
        }

        if (this.state.type === 'text') {
            return Promise.resolve([
                `data:application/javascript,${encodeURIComponent(this.state.text)}`
            ]);
        }

        return Promise.reject(new Error('Unknown type'));
    }

    hasValidInput () {
        if (this.state.type === 'url') {
            try {
                const parsed = new URL(this.state.url);
                if (this.authoring) {
                    return parsed.protocol === 'https:' && !parsed.username &&
                    !parsed.password && !parsed.hash;
                }
                return (
                    parsed.protocol === 'https:' ||
                    parsed.protocol === 'http:' ||
                    parsed.protocol === 'data:'
                );
            } catch (e) {
                return false;
            }
        }

        if (this.state.type === 'file') {
            return !!this.state.files?.length;
        }

        if (this.state.type === 'text') {
            return !!this.state.text;
        }

        return false;
    }

    handleChangeFiles (files) {
        this.setState({
            files,
            fileIds: Array.from(files || [], () => '')
        });
    }

    handleChangeURL (e) {
        this.setState({
            url: e.target.value
        });
    }

    handleClose () {
        this.operation?.abort();
        this.props.onClose();
    }

    handleKeyDown (e) {
        if (e.key === 'Enter' && this.hasValidInput()) {
            e.preventDefault();
            this.handleLoadExtension();
        }
    }

    async handleLoadExtension () {
        if (this.authoring) {
            if (this.hasValidInput()) this.setState({step: 'settings', status: ''});
            return;
        }
        this.handleClose();
        try {
            const urls = await this.getExtensionURLs();

            if (this.state.type !== 'url') {
                setPersistedUnsandboxed(this.state.unsandboxed);
                if (this.state.unsandboxed) {
                    for (const url of urls) {
                        manuallyTrustExtension(url);
                    }
                }
            }

            for (const url of urls) {
                await this.props.vm.extensionManager.loadExtensionURL(url);
            }
        } catch (err) {
            log.error(err);
            // eslint-disable-next-line no-alert
            alert(err);
        }
    }

    handleSwitchToFile () {
        this.setState({
            type: 'file'
        });
    }

    handleSwitchToURL () {
        this.setState({
            type: 'url'
        });
    }

    handleSwitchToText () {
        this.setState({
            type: 'text'
        });
    }

    handleChangeText (e) {
        this.setState({
            text: e.target.value
        });
    }

    handleDragOver (e) {
        if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
    }

    handleDragLeave () {

    }

    handleDrop (e) {
        const files = e.dataTransfer.files;
        if (files.length) {
            e.preventDefault();
            this.setState({
                type: 'file',
                files,
                fileIds: Array.from(files, () => '')
            });
        }
    }

    isUnsandboxed () {
        if (this.state.type === 'url') {
            return isTrustedExtension(this.state.url);
        }
        return this.state.unsandboxed;
    }

    canChangeUnsandboxed () {
        return this.state.type !== 'url';
    }

    handleChangeUnsandboxed (e) {
        this.setState({
            unsandboxed: e.target.checked
        });
    }

    render () {
        if (this.authoring && this.state.step === 'settings') {
            return (<AuthoringSettings
                locale={this.props.locale}
                sources={this.getSources()}
                ids={this.state.type === 'file' ? this.state.fileIds : [this.state.id]}
                type={this.state.type}
                distribution={this.state.type === 'url' ? this.state.distribution : 'embedded'}
                execution={this.state.execution}
                busy={this.state.busy}
                status={this.state.status}
                recoveryURL={this.state.recoveryURL}
                onClose={this.handleClose}
                onBack={this.handleBack}
                onSubmit={this.handleAddVerified}
                onChangeId={this.handleChangeId}
                onChangeDistribution={this.handleChangeDistribution}
                onChangeExecution={this.handleChangeExecution}
            />);
        }
        return (
            <CustomExtensionModalComponent
                authoring={Boolean(this.authoring)}
                status={this.authoring ? this.state.status : null}
                recoveryURL={this.state.recoveryURL}
                canLoadExtension={this.hasValidInput()}
                type={this.state.type}
                onSwitchToFile={this.handleSwitchToFile}
                onSwitchToURL={this.handleSwitchToURL}
                onSwitchToText={this.handleSwitchToText}
                files={this.state.files}
                onChangeFiles={this.handleChangeFiles}
                onDragOver={this.handleDragOver}
                onDragLeave={this.handleDragLeave}
                onDrop={this.handleDrop}
                url={this.state.url}
                onChangeURL={this.handleChangeURL}
                onKeyDown={this.handleKeyDown}
                text={this.state.text}
                onChangeText={this.handleChangeText}
                unsandboxed={this.isUnsandboxed()}
                onChangeUnsandboxed={this.canChangeUnsandboxed() ? this.handleChangeUnsandboxed : null}
                onLoadExtension={this.handleLoadExtension}
                onClose={this.handleClose}
            />
        );
    }
}

CustomExtensionModal.propTypes = {
    locale: PropTypes.string,
    onClose: PropTypes.func,
    vm: PropTypes.shape({
        emit: PropTypes.func,
        extensionManager: PropTypes.shape({
            loadExtensionURL: PropTypes.func
        })
    })
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm,
    locale: state.locales.locale
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeCustomExtensionModal())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(CustomExtensionModal);
