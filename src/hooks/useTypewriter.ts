import { useState, useEffect } from 'react';

export const useTypewriter = (phrases: string[], typingSpeed = 50, deletingSpeed = 30, pauseDuration = 2000) => {
    const [placeholder, setPlaceholder] = useState('');

    useEffect(() => {
        let currentPhraseIndex = 0;
        let currentCharIndex = 0;
        let isDeleting = false;
        let isPaused = false;
        let timeout: NodeJS.Timeout;

        const type = () => {
            const currentPhrase = phrases[currentPhraseIndex];

            if (isPaused) {
                timeout = setTimeout(() => {
                    isPaused = false;
                    isDeleting = true;
                    type();
                }, pauseDuration);
                return;
            }

            if (isDeleting) {
                setPlaceholder(currentPhrase.substring(0, currentCharIndex - 1));
                currentCharIndex--;
                if (currentCharIndex === 0) {
                    isDeleting = false;
                    currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
                }
                timeout = setTimeout(type, deletingSpeed);
            } else {
                setPlaceholder(currentPhrase.substring(0, currentCharIndex + 1));
                currentCharIndex++;
                if (currentCharIndex === currentPhrase.length) {
                    isPaused = true;
                }
                timeout = setTimeout(type, typingSpeed);
            }
        };

        timeout = setTimeout(type, 100);

        return () => clearTimeout(timeout);
    }, [phrases, typingSpeed, deletingSpeed, pauseDuration]);

    return placeholder;
};
