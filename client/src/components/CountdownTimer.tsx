import { useState, useEffect } from 'react';

interface CountdownTimerProps {
    targetDate: string;
    onEnd?: () => void;
}

const CountdownTimer = ({ targetDate, onEnd }: CountdownTimerProps) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft = {
            minutes: 0,
            seconds: 0
        };

        if (difference > 0) {
            timeLeft = {
                minutes: Math.floor((difference / 1000 / 60)),
                seconds: Math.floor((difference / 1000) % 60)
            };
        }

        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            const newTime = calculateTimeLeft();
            setTimeLeft(newTime);
            
            if (newTime.minutes === 0 && newTime.seconds === 0) {
                clearInterval(timer);
                if (onEnd) onEnd();
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [targetDate]);

    return (
        <span className="countdown-timer" style={{ 
            color: 'var(--color-accent)', 
            fontWeight: 'bold',
            fontSize: '0.9rem',
            background: 'rgba(212, 175, 55, 0.1)',
            padding: '2px 8px',
            borderRadius: '4px',
            marginLeft: '8px'
        }}>
            Ready in: {timeLeft.minutes}:{timeLeft.seconds.toString().padStart(2, '0')}
        </span>
    );
};

export default CountdownTimer;
