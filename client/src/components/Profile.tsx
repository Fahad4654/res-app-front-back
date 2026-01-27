import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getCurrentUser, saveAuth } from '../services/auth';
import { updateProfile } from '../services/api';
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

const Profile = () => {
    const user = getCurrentUser();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [formData, setFormData] = useState({
        name: user?.name || '',
        phoneNo: user?.phoneNo || '',
        address: user?.address || '',
        profilePicture: user?.profilePicture || ''
    });
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>(user?.profilePicture || '');

    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        const data = new FormData();
        data.append('name', formData.name);
        data.append('phoneNo', formData.phoneNo);
        data.append('address', formData.address);
        if (file) {
            data.append('profilePicture', file);
        } else {
            data.append('profilePicture', formData.profilePicture);
        }

        try {
            const result = await updateProfile(data);
            const token = localStorage.getItem('token');
            if (token) {
                saveAuth({ token, user: result.user });
            }
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="auth-container">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="auth-card"
            >
                <h2>User <span className="text-accent">Profile</span></h2>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="profile-pic-container" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div 
                            className="profile-pic-preview" 
                            style={{ 
                                width: '100px', 
                                height: '100px', 
                                borderRadius: '50%', 
                                margin: '0 auto 1rem', 
                                background: 'rgba(255,255,255,0.05)',
                                backgroundImage: preview ? `url(${preview})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                border: '2px solid var(--color-accent)'
                            }}
                        >
                            {!preview && <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>Photo</div>}
                        </div>
                        <input type="file" accept="image/*" onChange={handleFileChange} id="profilePicInput" style={{ display: 'none' }} />
                        <label htmlFor="profilePicInput" className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                            Change Photo
                        </label>
                    </div>

                    <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Email (Read only)</label>
                        <input type="email" value={user.email} disabled />
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input type="text" name="phoneNo" value={formData.phoneNo} onChange={handleChange} placeholder="e.g. +123456789" />
                    </div>
                    <div className="form-group">
                        <label>Address</label>
                        <textarea name="address" value={formData.address} onChange={handleChange} rows={3} placeholder="Your delivery address" style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff' }}></textarea>
                    </div>

                    {message.text && <div className={`auth-message ${message.type}`}>{message.text}</div>}

                    <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default Profile;
