import googleIcon from '../../assets/authentication/googleIcon.svg';
function GoogleIcon(){
    return(
        <button>
            <a href="https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=http://localhost:3000/&response_type=code&client_id=1036463666928-d3i3phfhglrl00l489tm3fccarm6p6nq.apps.googleusercontent.com&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile+openid&access_type=offline">
                <img className="w-[50px] cursor-pointer hover:scale-105 ease-in-out transition-all duration-300"
                src={googleIcon}
                alt='Google login' />
            </a>
        </button>
    )
}

export default GoogleIcon;