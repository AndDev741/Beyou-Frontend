import BeyouIcon from "../../ui/BeyouIcon";

type categoryNameAndIconProps = {
    iconId: string,
    name: string
}

function CategoryNameAndIcon({iconId, name}: categoryNameAndIconProps){
    return(
        <div className="flex items-center">
            <p className="text-[20px] text-icon">
                <BeyouIcon id={iconId} />
            </p>
            <p className="ml-1 text-secondary">{name}</p>
        </div>
    )
}

export default CategoryNameAndIcon;
