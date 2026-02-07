type buttonProps = {
    text: string,
    size: "big" | "medium" | "small";
    mode: "cancel" | "create" | "default";
    onClick?: () => void;
    type?: "submit" | "reset" | "button" | undefined;
    icon?: React.ReactNode;
}

function Button({text, size, mode, onClick, type, icon}: buttonProps){
    let style;

    switch(mode){
        case "cancel":
            style = "rounded-[20px] text-lg lg:text-2xl font-semibold bg-secondary/10 text-secondary hover:bg-secondary/20 hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 border border-primary";
            break;
        case "create":
            style = "bg-primary rounded-[20px] text-secondary text-2xl font-semibold hover:bg-primary/90 hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105"
            break;
        case "default":
            style = "bg-background rounded-md text-secondary text-lg lg:text-2xl font-semibold hover:bg-primary/90 hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 border border-description"
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
            <button
            className={`flex items-center justify-center ${style}`}
            onClick={onClick}
            type={type}
            >
                {icon && <span className="mr-2 md:mr-6 cursor-pointer">{icon}</span>}
                {text}
            </button>
    )
}

export default Button;
