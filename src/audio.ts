import { AudioRecorder } from "miniaudio_node";
import { startListener } from "rdev-node";
const recorder = new AudioRecorder();
recorder.start();
startListener((event) => {
    if (event.keyPress?.key === "space") {
        recorder.stop();
    }
    console.log(event);
    return event;
});
setTimeout(() => {
    recorder.stop();
    const audioBuffer = recorder.getBuffer();
    console.log(audioBuffer);
}, 5000);