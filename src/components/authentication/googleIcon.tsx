import googleIcon from '../../assets/authentication/googleIcon.svg';

const appUrl = import.meta.env.VITE_APP_URL || 'http://localhost:3000';
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1036463666928-d3i3phfhglrl00l489tm3fccarm6p6nq.apps.googleusercontent.com';

function GoogleIcon(){
    const handleGoogleLogin = () => {
        const state = crypto.randomUUID();
        sessionStorage.setItem('oauth_state', state);

        const redirectUri = encodeURIComponent(appUrl + '/');
        const scope = encodeURIComponent(
            'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid'
        );

        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=${redirectUri}&response_type=code&client_id=${clientId}&scope=${scope}&access_type=offline&state=${state}`;
    };

    return(
        <button onClick={handleGoogleLogin} type="button">
            <img className="w-[50px] cursor-pointer hover:scale-105 ease-in-out transition-all duration-300"
            src={googleIcon}
            alt='Google login' />
        </button>
    )
}

export default GoogleIcon;