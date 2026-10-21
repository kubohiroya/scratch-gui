import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import GreenFlag from '../green-flag/green-flag.jsx';
import StopAll from '../stop-all/stop-all.jsx';
import CameraControl from '../camera-control/camera-control.jsx';
import TurboMode from '../turbo-mode/turbo-mode.jsx';
import FramerateIndicator from '../tw-framerate-indicator/framerate-indicator.jsx';

import styles from './controls.css';

const messages = defineMessages({
    goTitle: {
        id: 'gui.controls.go',
        defaultMessage: 'Go',
        description: 'Green flag button title'
    },
    stopTitle: {
        id: 'gui.controls.stop',
        defaultMessage: 'Stop',
        description: 'Stop button title'
    }
});

const Controls = function (props) {
    const {
        active,
        cameraService,
        cameraSnapshot,
        extensionControls,
        className,
        intl,
        onGreenFlagClick,
        onStopAllClick,
        turbo,
        framerate,
        interpolation,
        isSmall,
        ...componentProps
    } = props;
    return (
        <div
            className={classNames(styles.controlsContainer, className)}
            {...componentProps}
        >
            <GreenFlag
                active={active}
                title={intl.formatMessage(messages.goTitle)}
                onClick={onGreenFlagClick}
            />
            <StopAll
                active={active}
                title={intl.formatMessage(messages.stopTitle)}
                onClick={onStopAllClick}
            />
            {cameraService && <CameraControl
                className={styles.extensionControl}
                closeLabel={intl.locale.startsWith('ja') ? '閉じる' : 'Close'}
                isSmall={isSmall}
                label={intl.locale.startsWith('ja') ? 'カメラ' : 'Camera'}
                service={cameraService}
                snapshot={cameraSnapshot}
            />}
            {extensionControls.filter(control => control.visible).map(control => {
                const handleClick = control.onClick;
                return (
                    <button
                        aria-expanded={control.expanded}
                        aria-haspopup="dialog"
                        aria-label={control.label}
                        className={styles.extensionControl}
                        data-extension-stage-control={control.id}
                        key={control.id}
                        ref={control.ref}
                        title={control.label}
                        type="button"
                        onClick={handleClick}
                    >
                        <span aria-hidden="true">{control.icon}</span>
                        {!isSmall && <span className={styles.extensionLabel}>{control.text}</span>}
                    </button>
                );
            })}
            {turbo ? (
                <TurboMode isSmall={isSmall} />
            ) : null}
            {!isSmall && (
                <FramerateIndicator
                    framerate={framerate}
                    interpolation={interpolation}
                />
            )}
        </div>
    );
};

Controls.propTypes = {
    active: PropTypes.bool,
    cameraService: PropTypes.object,
    cameraSnapshot: PropTypes.object,
    extensionControls: PropTypes.arrayOf(PropTypes.object),
    className: PropTypes.string,
    intl: intlShape.isRequired,
    onGreenFlagClick: PropTypes.func.isRequired,
    onStopAllClick: PropTypes.func.isRequired,
    framerate: PropTypes.number,
    interpolation: PropTypes.bool,
    isSmall: PropTypes.bool,
    turbo: PropTypes.bool
};

Controls.defaultProps = {
    active: false,
    extensionControls: [],
    turbo: false,
    isSmall: false
};

export default injectIntl(Controls);
