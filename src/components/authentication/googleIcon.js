import googleIcon from '../../assets/authentication/googleIcon.svg';
function GoogleIcon(){
    return(
        <button>
            <img className="w-[50px] cursor-pointer hover:scale-105 ease-in-out transition-all duration-300"
            src={googleIcon}
            alt='Google login' />
        </button>
    )
}

export default GoogleIcon;