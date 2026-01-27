import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InputModalProps {
    isOpen: boolean;
    title: string;
    message?: string;
    placeholder?: string;
    defaultValue?: string;
    onSubmit: (value: string) => void;
    onCancel: () => void;
    inputType?: 'text' | 'number';
}

const InputModal = ({ 
    isOpen, 
    title, 
    message,
    placeholder = '',
    defaultValue = '',
    onSubmit, 
    onCancel,
    inputType = 'text'
}: InputModalProps) => {
    const [value, setValue] = useState(defaultValue);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (value.trim()) {
            onSubmit(value);
            onCancel();
            setValue('');
        }
    };

    return (
        <AnimatePresence>
            <div className="modal-overlay" onClick={onCancel}>
                <motion.div 
                    className="modal-content"
                    onClick={e => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={{ maxWidth: '450px' }}
                >
                    <div className="modal-header">
                        <h3>{title}</h3>
                        <button className="close-modal" onClick={onCancel}>&times;</button>
                    </div>
                    <div className="modal-body">
                        {message && <p style={{ color: '#ccc', marginBottom: '1rem' }}>{message}</p>}
                        <input
                            type={inputType}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={placeholder}
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(212, 175, 55, 0.3)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '1rem'
                            }}
                        />
                    </div>
                    <div className="modal-footer" style={{ gap: '1rem', justifyContent: 'flex-end' }}>
                        <button 
                            className="btn-small" 
                            onClick={onCancel}
                            style={{ padding: '0.6rem 1.2rem' }}
                        >
                            Cancel
                        </button>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleSubmit}
                            style={{ padding: '0.6rem 1.2rem', background: 'var(--color-accent)', color: '#000' }}
                        >
                            Submit
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default InputModal;
