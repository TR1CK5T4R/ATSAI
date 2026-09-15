import { useState, useEffect, useRef, useCallback } from 'react';

const useSpeech = (options = {}) => {
    const { onSilence, silenceTimeout = 5000 } = options;
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [silenceTimeLeft, setSilenceTimeLeft] = useState(silenceTimeout / 1000);
    
    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);
    const silenceTimerRef = useRef(null);
    const countdownIntervalRef = useRef(null);

    const requestPermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setPermissionGranted(true);
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (err) {
            console.error('Microphone permission denied', err);
            setPermissionGranted(false);
            return false;
        }
    };

    const resetSilenceTimer = useCallback(() => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        
        if (isListening && transcript.trim()) {
            setSilenceTimeLeft(silenceTimeout / 1000);
            countdownIntervalRef.current = setInterval(() => {
                setSilenceTimeLeft(prev => Math.max(0, prev - 1));
            }, 1000);
            
            silenceTimerRef.current = setTimeout(() => {
                if (onSilence) onSilence();
            }, silenceTimeout);
        } else {
            setSilenceTimeLeft(silenceTimeout / 1000);
        }
    }, [isListening, transcript, onSilence, silenceTimeout]);

    useEffect(() => {
        // Restarting the silence countdown on every transcript change is the point of this effect
        // eslint-disable-next-line react-hooks/set-state-in-effect
        resetSilenceTimer();
        return () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, [transcript, isListening, resetSilenceTimer]);

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window)) {
            console.warn('Web Speech API not supported');
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);

        recognition.onresult = (event) => {
             let currentTranscript = '';
             for (let i = 0; i < event.results.length; ++i) {
                 currentTranscript += event.results[i][0].transcript;
             }
             if (currentTranscript) {
                 setTranscript(currentTranscript);
             }
        };

        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        
        return () => {
            recognitionRef.current?.stop();
        };
    }, []);

    const startListening = useCallback(() => {
        setTranscript('');
        try {
            recognitionRef.current?.start();
        } catch {
            // Already started
        }
    }, []);

    const stopListening = useCallback(() => {
        try {
            recognitionRef.current?.stop();
        } catch {
            // Error stopping
        }
    }, []);

    const speak = useCallback((text) => {
        if (synthRef.current.speaking) {
            synthRef.current.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            if (options.onSpeakEnd) {
                options.onSpeakEnd();
            }
        };

        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
        if (preferredVoice) utterance.voice = preferredVoice;

        synthRef.current.speak(utterance);
    }, [options]);

    const cancelSpeech = useCallback(() => {
        synthRef.current.cancel();
        setIsSpeaking(false);
    }, []);

    return {
        isListening,
        transcript,
        isSpeaking,
        permissionGranted,
        silenceTimeLeft,
        requestPermission,
        startListening,
        stopListening,
        speak,
        cancelSpeech,
        setTranscript
    };
};

export default useSpeech;
