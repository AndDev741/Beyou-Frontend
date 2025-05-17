import { TFunction } from "i18next";


type deleteProps = {
    objectId: string, 
    onDelete: boolean, 
    setOnDelete: React.Dispatch<React.SetStateAction<boolean>>
    t: TFunction, 
    name: string,
    setObjects: any,
    deleteObject: any,
    getObjects: any,
    deletePhrase: string
}

function DeleteModal({objectId, onDelete, setOnDelete, t, name, setObjects, deleteObject, getObjects, deletePhrase}: deleteProps){

    const handleDelete = async () => {
        const response = await deleteObject(objectId, t);

        if(response.success){
           const newHabits = await getObjects(t);
           if(Array.isArray(newHabits.success)){
            setObjects(newHabits.success);
           }
        }
    }
    return(
        <div className={`${onDelete ? "flex" : "hidden"} flex-col items-center justify-center absolute top-0 left-0 h-[100%] w-[100%] bg-white rounded-md`}>
            <h1 className="text-center font-semibold">{deletePhrase}</h1>
            <h2 className="underline my-3">{name}</h2>
            <div className="flex lg:flex-row flex-col items-center">
                <button onClick={handleDelete}
                className="bg-red-600 hover:bg-red-500 lg:mr-1 text-white font-semibold w-[100px] h-[28px] rounded-md">
                    {t('Delete')}
                </button>
                <button onClick={() => setOnDelete(false)}
                className="bg-gray-600 hover:bg-gray-500 mt-1 lg:mt-0 lg:ml-1 text-white font-semibold w-[100px] h-[28px] rounded-md">
                    {t('Cancel')}
                </button>
            </div>
        </div>
    )
}

export default DeleteModal;