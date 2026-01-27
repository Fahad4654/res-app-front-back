import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
}

const ConfirmModal = ({ 
    isOpen, 
    title, 
    message, 
    onConfirm, 
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
}: ConfirmModalProps) => {
    if (!isOpen) return null;

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
                        <p style={{ color: '#ccc', lineHeight: '1.6' }}>{message}</p>
                    </div>
                    <div className="modal-footer" style={{ gap: '1rem', justifyContent: 'flex-end' }}>
                        <button 
                            className="btn-small" 
                            onClick={onCancel}
                            style={{ padding: '0.6rem 1.2rem' }}
                        >
                            {cancelText}
                        </button>
                        <button 
                            className="btn btn-primary" 
                            onClick={() => {
                                onConfirm();
                                onCancel();
                            }}
                            style={{ padding: '0.6rem 1.2rem', background: 'var(--color-accent)', color: '#000' }}
                        >
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ConfirmModal;
