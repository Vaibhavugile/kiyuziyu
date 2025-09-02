// src/components/Footer.jsx
import React from 'react';
import logo from '../assets/logoj.png'; // your actual logo path

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-section about">
                <img src={logo} alt="Kiyuziyu Logo" className="logo" />
                <p>We supply anti-tarnish imitation jewellery to wholesalers and resellers in all over India.</p>
                <div className="social-icons">
                    <a
                        href="https://www.instagram.com/kiyuziyu.in?igsh=MXdhMjMwemxocW12Mg%3D%3D&utm_source=qr"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <i className="fab fa-instagram" />
                    </a>
                    <a
                        href="https://www.facebook.com/share/18tpo74YJB/?mibextid=wwXIfr"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <i className="fab fa-facebook" />
                    </a>
                    <a
                        href="https://youtube.com/@kiyuziyu?si=Nlm3bbKaVx51JCvg"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <i className="fab fa-youtube" />
                    </a>
                    
                    <a
                        href="https://wa.me/917897897441"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <i className="fab fa-whatsapp" />
                    </a>
                </div>


            </div>
            <div className="footer-section contact">
                <h4>Contact Us</h4>
                <p>📍 Streets Of Europe Hinjewadi PUNE</p>
                <p>📞 +91 7897897441</p>
                <p>✉️ tanishkaenterprisesxion@gmail.com</p>
            </div>
            <div className="footer-section links">
                <h4>Important Links</h4>
                <ul>
                    <li>Home</li>
                    <li>Collections</li>
                    <li>Gallery</li>
                    <li>About</li>
                    <li>Contact</li>
                </ul>
            </div>
        </footer>
    );
};

export default Footer;
