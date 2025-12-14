import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans py-12 px-6 md:py-20">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors mb-8 group">
                    <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                </Link>

                <h1 className="font-serif text-4xl md:text-5xl font-medium mb-4">Terms of Service</h1>
                <p className="text-muted-foreground mb-12">Last updated: November 29, 2025</p>

                <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            By accessing or using the BananaCanvas AI website and services ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, then you may not access the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            BananaCanvas AI provides an artificial intelligence-powered platform for generating and editing images ("Generations"). You understand that the Service uses experimental technology and may produce unpredictable results.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service. You are responsible for safeguarding the password that you use to access the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">4. User Conduct & Content Standards</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            You agree not to use the Service to generate content that:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>Is illegal, harmful, threatening, abusive, harassing, tortious, defamatory, vulgar, obscene, libelous, invasive of another's privacy, hateful, or racially, ethnically or otherwise objectionable.</li>
                            <li>Infringes any patent, trademark, trade secret, copyright, or other proprietary rights of any party.</li>
                            <li>Depicts sexual violence and nonconsensual sexual content.</li>
                            <li>Promotes illegal acts.</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-4">
                            We reserve the right to ban users who violate these guidelines.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">5. Intellectual Property Rights</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Subject to your compliance with these Terms, you own all rights, title, and interest in and to the images you generate using the Service ("Output"). You grant BananaCanvas AI a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright license to reproduce, prepare derivative works of, publicly display, publicly perform, sublicense, and distribute the Output for the purpose of operating, promoting, and improving the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">6. Payment and Credits</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Certain aspects of the Service may be provided for a fee or other charge. If you elect to use paid aspects of the Service, you agree to the pricing and payment terms as we may update them from time to time. Credits purchased are non-refundable except as required by law.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">7. Limitation of Liability</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            In no event shall BananaCanvas AI, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">8. Changes to Terms</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">9. Contact Us</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If you have any questions about these Terms, please contact us at: <br />
                            <a href="mailto:support@bananacanvas.ai" className="text-brand-DEFAULT hover:underline">support@bananacanvas.ai</a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
