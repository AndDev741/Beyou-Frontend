import BeyouIcon from "../../ui/BeyouIcon";

type categoryNameAndIconProps = {
    iconId: string,
    name: string
}

function CategoryNameAndIcon({iconId, name}: categoryNameAndIconProps){
    return(
        <div className="flex items-center">
            <p className="text-[20px] text-text-2">
                <BeyouIcon id={iconId} />
            </p>
            <p className="ml-1 text-text">{name}</p>
        </div>
    )
}

export default CategoryNameAndIcon;
