import React, {useState, useEffect} from 'react';
import {ui, firebase} from './AuthConfig';
import 'bootstrap/dist/css/bootstrap.min.css';
import Profile from './profile';

function LoginUI(props){
    const {setLogin}= props;
    
    useEffect(()=>{
        const ele = document.getElementById('firebaseui-auth-container');
        ui.start(ele, {
            signInOptions:[{
                provider:firebase.auth.PhoneAuthProvider.PROVIDER_ID,
                recaptchaParameters: {
                    type: 'image', // 'audio'
                    size: 'normal', // 'invisible' or 'compact' 'normal'
                    badge: 'bottomleft' //' bottomright' or 'inline' applies to invisible.
                }
            }],
            callbacks:{signInSuccessWithAuthResult:(result, url)=>{
                setLogin(result.user.uid);
                return false;
            }},
        });
        
    }, []);
    return (
        <div id="firebaseui-auth-container"></div>
    )
}
export default LoginUI;