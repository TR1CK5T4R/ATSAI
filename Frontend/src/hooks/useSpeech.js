import { useState, useEffect, useRef, useCallback } from 'react';

const useSpeech = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window)) {
            console.warn('Web Speech API not supported');
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);

        recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                setTranscript(finalTranscript);
            }
        };

        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };

        recognitionRef.current = recognition;
    }, []);

    const startListening = useCallback(() => {
        setTranscript('');
        recognitionRef.current?.start();
    }, []);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
    }, []);

    const speak = useCallback((text) => {
        if (synthRef.current.speaking) {
            synthRef.current.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);

        // Select a pleasant voice if available
        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
        if (preferredVoice) utterance.voice = preferredVoice;

        synthRef.current.speak(utterance);
    }, []);

    const cancelSpeech = useCallback(() => {
        synthRef.current.cancel();
        setIsSpeaking(false);
    }, []);

    return {
        isListening,
        transcript,
        isSpeaking,
        startListening,
        stopListening,
        speak,
        cancelSpeech,
        setTranscript
    };
};

export default useSpeech;
