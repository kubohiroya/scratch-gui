import React from 'react';
import PropTypes from 'prop-types';
import styles from './camera-control.css';

class ProviderContent extends React.Component {
    componentDidMount () {
        const provider = this.props.provider;
        this.mount.appendChild(provider.element);
        const operation = provider.onOpen;
        this.active = true;
        Promise.resolve().then(() => this.active && operation && operation())
            .catch(() => {
            // Provider-owned content reports its own camera diagnostics.
            });
    }
    componentWillUnmount () {
        this.active = false;
        const provider = this.props.provider;
        try {
            if (provider.onClose) provider.onClose();
        } finally {
            if (provider.element.parentNode === this.mount) this.mount.removeChild(provider.element);
        }
    }
    render () {
        return (<div
            className={styles.provider}
            ref={element => {
                this.mount = element;
            }}
        />);
    }
}
ProviderContent.propTypes = {provider: PropTypes.object.isRequired};

export default ProviderContent;
