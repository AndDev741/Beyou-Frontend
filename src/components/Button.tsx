type buttonProps = {
    text: string,
    size: "big" | "medium" | "small";
    mode: "cancel" | "create";
    onClick?: () => void;
}

function Button({text, size, mode, onClick}: buttonProps){
    let style;

    switch(mode){
        case "cancel":
            style = "rounded-[20px] text-lg lg:text-2xl font-semibold bg-secondary/10 text-secondary hover:bg-secondary/20 hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 border border-primary";
            break;
        case "create":
            style = "bg-primary rounded-[20px] text-white text-2xl font-semibold hover:bg-primary/90 hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105"
        break;
    }

    switch(size){
        case "big":
            style = style + " w-[250px] h-[45px]"
            break;
        case "medium":
            style = style + " w-[120px] md:w-[200px] h-[45px]";
            break;
        case "small":
            style = style + " w-[60px] md:2-[150px] h-[45px]";
            break;
    }


    return(
        <button className={style}
        onClick={onClick}
        >
            {text}
        </button>
    )
}

export default Button;
