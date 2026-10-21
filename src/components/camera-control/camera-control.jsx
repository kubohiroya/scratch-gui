import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import styles from './camera-control.css';
import ProviderContent from './provider-content.jsx';

class CameraControl extends React.Component {
    constructor (props) {
        super(props);
        this.state = {left: 8, top: 48};
        this.handleToggle = this.handleToggle.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleKey = this.handleKey.bind(this);
        this.handleOutside = this.handleOutside.bind(this);
        this.handlePosition = this.handlePosition.bind(this);
        this.handleSelect = this.handleSelect.bind(this);
    }
    componentDidMount () {
        document.addEventListener('keydown', this.handleKey, true);
        document.addEventListener('pointerdown', this.handleOutside, true);
        window.addEventListener('resize', this.handlePosition);
    }
    componentDidUpdate (previous) {
        if (this.props.snapshot.open && !previous.snapshot.open) this.handlePosition();
    }
    componentWillUnmount () {
        document.removeEventListener('keydown', this.handleKey, true);
        document.removeEventListener('pointerdown', this.handleOutside, true);
        window.removeEventListener('resize', this.handlePosition);
    }
    handlePosition () {
        if (!this.button || !this.props.snapshot.open) return;
        const rect = this.button.getBoundingClientRect();
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - 336));
        const top = Math.min(rect.bottom + 8, Math.max(8, window.innerHeight - 120));
        if (left !== this.state.left || top !== this.state.top) this.setState({left, top});
    }
    handleToggle () {
        const {open, provider} = this.props.snapshot;
        this.props.service.toggle();
        if (!open && provider && provider.kind === 'settings' && !provider.running && provider.onStart) {
            // Opening the entry offers the native permission element; it never clicks it.
            Promise.resolve(provider.onStart()).catch(() => {});
        }
    }
    handleClose () {
        this.props.service.close();
        if (this.button) this.button.focus();
    }
    handleKey (event) {
        if (this.props.snapshot.open && event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            this.handleClose();
        }
    }
    handleOutside (event) {
        if (this.props.snapshot.open && this.panel && !this.panel.contains(event.target) &&
            this.button && !this.button.contains(event.target)) this.props.service.close();
    }
    handleSelect (event) {
        this.props.service.select(event.target.value);
    }
    render () {
        const {snapshot, label, closeLabel, className, isSmall} = this.props;
        if (!snapshot.provider) return null;
        const {provider, cameraIds, cameraId, open} = snapshot;
        return (<React.Fragment>
            <button
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-label={label}
                className={className}
                data-extension-stage-control="camera"
                ref={element => {
                    this.button = element;
                }}
                title={label}
                type="button"
                onClick={this.handleToggle}
            >
                <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                >
                    <path
                        fill="currentColor"
                        d="M8 4 6 7H3v14h18V7h-3l-2-3H8zm4 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10z"
                    />
                </svg>
                {!isSmall && <span className={styles.label}>{label}</span>}
            </button>
            {open && ReactDOM.createPortal(
                <div
                    aria-label={label}
                    className={styles.panel}
                    data-editor-camera-panel="true"
                    data-camera-mode={provider.kind === 'permission' || !provider.running ? 'permission' : 'settings'}
                    ref={element => {
                        this.panel = element;
                    }}
                    role="dialog"
                    style={{left: this.state.left,
                        top: this.state.top,
                        maxHeight: Math.max(80, window.innerHeight - this.state.top - 8)}}
                >
                    <div className={styles.header}>
                        <strong>{label}</strong>
                        <button
                            aria-label={closeLabel}
                            type="button"
                            onClick={this.handleClose}
                        >{'×'}</button>
                    </div>
                    {cameraIds.length > 1 && <select
                        aria-label={label}
                        value={cameraId}
                        onChange={this.handleSelect}
                    >
                        {cameraIds.map(id => (<option
                            key={id}
                            value={id}
                        >{id}</option>))}
                    </select>}
                    <div className={styles.body}>
                        <ProviderContent
                            key={`${provider.token}:${provider.running}`}
                            provider={provider}
                        />
                    </div>
                </div>, document.fullscreenElement || document.body
            )}
        </React.Fragment>);
    }
}
CameraControl.propTypes = {
    snapshot: PropTypes.object.isRequired,
    service: PropTypes.object.isRequired,
    label: PropTypes.string.isRequired,
    closeLabel: PropTypes.string.isRequired,
    className: PropTypes.string,
    isSmall: PropTypes.bool
};
export default CameraControl;
