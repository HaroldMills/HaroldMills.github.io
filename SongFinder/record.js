const _DESIRED_SAMPLE_RATE = 48000;
const _RING_BUFFER_PROCESSOR_PATH = 'ring-buffer-processor.js';

let _audioInputDevices = null;
let _recording = false;
let _audioContext = null;


async function _test() {

    _audioInputDevices = await _getAudioInputDevices();

    _populateDevicesSelect();
    _initializeRecordButton();

    _showDevices(_audioInputDevices);

}


async function _getAudioInputDevices() {

    // Try to get an audio input stream to trigger browser's permission
    // dialog if we don't already have permission to record audio. We
    // won't actually use the input stream: we just want to make sure
    // we have permission to record audio before we enumerate devices.
    // If we enumerate devices without permission to record audio we
    // won't get the devices' labels (i.e. their names), only their IDs.

    try {

        await navigator.mediaDevices.getUserMedia({audio: true});

        const allDevices = await navigator.mediaDevices.enumerateDevices();

        const audioInputDevices = allDevices.filter(
            device => device.kind === 'audioinput');

        return audioInputDevices;

    } catch (error) {

        console.log(
            `Error getting audio input devices: ${error.name}: ` +
            `${error.message}`);

        return [];

    }

}


function _populateDevicesSelect() {

    const select = document.getElementById('devices-select');

    for (const device of _audioInputDevices) {

        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label;
        select.add(option);

    }

}


function _initializeRecordButton() {
    const button = document.getElementById('record-button');
    button.onclick = _onRecordButtonClick;
    _updateRecordButtonText();
}


function _updateRecordButtonText() {
    console.log('_updateRecordButtonText', _recording);
    const button = document.getElementById('record-button');
    button.innerHTML = _recording ? 'Stop' : 'Record';
}


function _onRecordButtonClick(e) {

    if (!_recording) {

        const device = _getSelectedDevice();
        _startRecording(device);

    } else {

        _stopRecording();

    }

}


function _getSelectedDevice() {
    const select = document.getElementById('devices-select');
    return _audioInputDevices[select.selectedIndex];
}


function _startRecording(device) {

    console.log(
        `_startRecording label "${device.label}", id "${device.deviceId}"`);

    const constraints = {

        audio: {
            deviceId: device.deviceId,
            channelCount: 1,
            sampleRate: _DESIRED_SAMPLE_RATE,
            sampleSize: 16,
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false,
        }

    }

    navigator.mediaDevices.getUserMedia(constraints).then(stream => {

        _showStream(stream);

        const context = new AudioContext({
            sampleRate: _DESIRED_SAMPLE_RATE
        });

        context.audioWorklet.addModule(
                _RING_BUFFER_PROCESSOR_PATH).then(() => {

            const source = context.createMediaStreamSource(stream);

            let ringBuffer =
                new AudioWorkletNode(context, 'ring-buffer-processor');

            source.connect(ringBuffer)
            ringBuffer.connect(context.destination);

            _audioContext = context;

            _recording = true;

            _updateRecordButtonText();

        }).catch(e => {

            console.log(
                `Attempt to add ring buffer audio worklet module failed ` +
                 `with message: ${e.message}`);

        });

//        const processor = context.createScriptProcessor(null, 1, 1);
//        source.connect(processor);
//        processor.connect(context.destination);
//
//        processor.onaudioprocess = function(e) {
//            const samples = e.inputBuffer.getChannelData(0);
//            console.log(
//                `Got input of length ${samples.length} ${samples[0]}.`);
//        }

    }).catch(e => {

        console.log(
            `Attempt to start recording failed with message: ${e.message}`);

    });

}


function _showStream(stream) {

    console.log('_startRecording got stream:');
    const tracks = stream.getAudioTracks();
    for (const track of tracks) {
        console.log('    track:');
        const settings = track.getSettings();
        console.log('        settings:', settings);
    }

}


function _stopRecording() {

    console.log('_stopRecording');

    _audioContext.close();
    _audioContext = null;

    _recording = false;

    _updateRecordButtonText();

}


function _showDevices(devices) {
    console.log('Audio input devices:');
    for (const device of devices)
        console.log(
            `    label "${device.label}", id "${device.deviceId}"`);
}


_test();
