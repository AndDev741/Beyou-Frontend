function Button({text}: {text: string}){
    return(
        <button className="w-[250px] h-[45px] bg-primary rounded-[20px] text-white text-2xl font-semibold hover:bg-primary/90 hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105">
            {text}
        </button>
    )
}

export default Button;
