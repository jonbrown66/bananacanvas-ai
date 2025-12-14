'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');

        try {
            const response = await fetch('/api/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setStatus('success');
                setFormData({ name: '', email: '', message: '' });
            } else {
                setStatus('error');
            }
        } catch (error) {
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans py-12 px-6 md:py-20 flex flex-col items-center">
            <div className="w-full max-w-3xl">
                <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors mb-12 group">
                    <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                </Link>
            </div>

            <div className="text-center mb-12">
                <h1 className="font-serif text-4xl md:text-5xl font-medium mb-4">Contact</h1>
                <p className="text-muted-foreground text-lg">We'll help you find the right plan for your business</p>
            </div>

            <div className="w-full max-w-xl bg-card border border-border rounded-2xl p-8 shadow-2xl">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">Contact Us</h2>
                    <p className="text-muted-foreground text-sm">If you have any questions or feedback, please reach out to our team</p>
                </div>

                {status === 'success' ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Message Sent!</h3>
                        <p className="text-muted-foreground">We'll get back to you as soon as possible.</p>
                        <button
                            onClick={() => setStatus('idle')}
                            className="mt-6 text-brand-DEFAULT hover:underline"
                        >
                            Send another message
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium text-foreground">Name</label>
                            <input
                                type="text"
                                id="name"
                                required
                                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-DEFAULT/50 focus:border-brand-DEFAULT transition-all placeholder:text-muted-foreground/50"
                                placeholder="Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
                            <input
                                type="email"
                                id="email"
                                required
                                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-DEFAULT/50 focus:border-brand-DEFAULT transition-all placeholder:text-muted-foreground/50"
                                placeholder="Email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="message" className="text-sm font-medium text-foreground">Message</label>
                            <textarea
                                id="message"
                                required
                                rows={4}
                                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-DEFAULT/50 focus:border-brand-DEFAULT transition-all placeholder:text-muted-foreground/50 resize-none"
                                placeholder="Message"
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            />
                        </div>

                        {status === 'error' && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                                Something went wrong. Please try again later.
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full py-3 px-6 bg-white hover:bg-gray-200 text-black font-bold rounded-lg transition-colors shadow-lg shadow-white/10 mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {status === 'loading' ? (
                                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                'Submit'
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
