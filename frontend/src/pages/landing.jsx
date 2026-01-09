import React from "react";
import "../App.css"
import { Link } from "react-router-dom";

export default function LandingPage(){

    return (
        <div className="landingPageContainer">
            <nav>
                <div className="navHeader">
                    <h2>Huddle</h2>
                </div>
                <div className="navlist">
                    <p> Join as Guest</p>
                    <p> Register</p>
                    <div role="button">
                        <p>Login</p>
                    </div>
                </div>
            </nav>

            <div className="landingMainContainer">
                <div className="block1">
                    <h1><span style={{color:"orange"}}>Connect</span> with your twin</h1>
                    <p>Cover a Distance with Huddle</p>
                    <div role="button">
                        <Link to={"/home"}>Get Started</Link>
                    </div>
                </div>
                <div>
                </div>
            </div>
        </div>
    )
}   