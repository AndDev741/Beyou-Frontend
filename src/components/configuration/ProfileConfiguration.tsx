import { useTranslation } from "react-i18next";
import { MdClose, MdCreate } from "react-icons/md";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/rootReducer";
import { Dispatch, SetStateAction, useState } from "react";
import { EditUser } from "../../types/user/EditUser";
import editUser from "../../services/user/editUser";
import { useDispatch } from "react-redux";
import { nameEnter, photoEnter, phraseAuthorEnter, phraseEnter } from "../../redux/user/perfilSlice";


export default function ProfileConfiguration() {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const name = useSelector((state: RootState) => state.perfil.username);
    const email = useSelector((state: RootState) => state.perfil.email);
    const photo = useSelector((state: RootState) => state.perfil.photo);
    const phrase = useSelector((state: RootState) => state.perfil.phrase);
    const phrase_author = useSelector((state: RootState) => state.perfil.phrase_author);

    const [editName, setEditName] = useState(name);
    const [editPhoto, setEditPhoto] = useState(photo);
    const [editPhrase, setEditPhrase] = useState(phrase);
    const [editPhraseAuthor, setEditPhraseAuthor] = useState(phrase_author);

    const [editPhotoModal, setEditPhotoModal] = useState(false);
    const [successPhrase, setSuccessPhrase] = useState("");
    // const [editEmail, setEditEmail] = useState(email);

    const labelStyle = "mb-1font-medium text-lg self-start";
    const inputStyle = "border-[1px] border-blueMain rounded-md pl-1 outline-none w-full mb-2";

    const onSubmit = async (e: React.FormEvent) => {
        setSuccessPhrase("");
        e.preventDefault();

        const editUserDTO: EditUser = {
            name: editName,
            photo: editPhoto,
            phrase: editPhrase,
            phrase_author: editPhraseAuthor
        }

        const response = await editUser(editUserDTO);

        if (response.error) {
            console.error(response.error);
        } else {
            console.log("User edited successfully");
            setSuccessPhrase(t('SuccessEditProfile'));

            dispatch(nameEnter(editName));
            dispatch(phraseEnter(editPhrase));
            dispatch(phraseAuthorEnter(editPhraseAuthor));
            dispatch(photoEnter(editPhoto));
        }
    }

    return (
        <div className="w-full h-full flex flex-col justify-start items-start p-2">
            <h1 className="text-2xl font-semibold">{t('Profile')}</h1>
            <form className="w-full flex items-center">

                <div className="w-[30%] lg:w-[25%] flex flex-col items-center mb-10"
                    onClick={() => setEditPhotoModal(true)}>
                    <img src={editPhoto}
                        alt={t('Profile')}
                        className="w-24 h-24 lg:w-32 lg:h-32 rounded-full cursor-pointer" />

                    <label className=" font-medium text-center text-blueMain flex items-center gap-1 cursor-pointer underline">
                        Change Photo <MdCreate />
                    </label>
                </div>

                <div className="w-[80%] lg:w-[75%] flex flex-col items-end">
                    <label className={labelStyle} htmlFor="name">{t('Name')}</label>
                    <input type="text" placeholder={t('NamePlaceholder')}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        id="name"

                        className={inputStyle}
                    />

                    <label className={labelStyle} htmlFor="email">{t('Email')}</label>
                    <input type="email" placeholder={t('EmailPlaceholder')}
                        value={email}
                        disabled
                        onChange={(e) => setEditPhoto(e.target.value)}
                        id="email"
                        className={`${inputStyle} text-gray-400 cursor-not-allowed`}
                    />

                    <label className={labelStyle} htmlFor="phrase">{t('Phrase')}</label>
                    <textarea placeholder={t('PhrasePlaceholder')}
                        id="phrase"
                        value={editPhrase}
                        onChange={(e) => setEditPhrase(e.target.value)}
                        className={inputStyle}
                    />

                    <label className={labelStyle} htmlFor="author">{t('Author')}</label>
                    <input type="text" placeholder={t('AuthorPlaceholder')}
                        id="author"
                        value={editPhraseAuthor}
                        onChange={(e) => setEditPhraseAuthor(e.target.value)}
                        className={inputStyle}
                    />

                </div>

            </form>
            <div className="flex flex-col items-center justify-center w-full pt-2">
                <button
                    onClick={onSubmit}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t('Save')}
                </button>
                <p className="text-green-600">{successPhrase}</p>
            </div>
            {/* {editPhoto && <EditPhotoUrl />} */}
            <div className={`${editPhotoModal ? "block" : "hidden"}`}>
                <EditPhotoUrl
                    setEditPhotoModal={setEditPhotoModal}
                    currentPhotoUrl={editPhoto}
                    setEditPhoto={setEditPhoto}
                    t={t}
                />
            </div>
        </div>
    )
}

type EditPhotoUrlProps = {
    setEditPhotoModal: Dispatch<SetStateAction<boolean>>;
    currentPhotoUrl: string;
    setEditPhoto: Dispatch<SetStateAction<string>>;
    t: (key: string) => string;
};

function EditPhotoUrl({ setEditPhotoModal, currentPhotoUrl, setEditPhoto, t }: EditPhotoUrlProps) {
    const [tempPhotoUrl, setTempPhotoUrl] = useState(currentPhotoUrl);

    const handleSave = () => {
        setEditPhoto(tempPhotoUrl);
        setEditPhotoModal(false);
    };

    const handleClose = () => {
        // Volta para o URL original ao fechar
        setTempPhotoUrl(currentPhotoUrl);
        setEditPhotoModal(false);
    }
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">

            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4 transform transition-all duration-300 scale-100">

                <div className="flex justify-between items-center border-b pb-3">
                    <h2 className="text-xl font-bold text-gray-800">{t('ChangeProfilePhoto')}</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-500 hover:text-red-500 transition duration-150"
                        aria-label={t('Close')}
                    >
                        <MdClose size={24} />
                    </button>
                </div>

                <div className="flex flex-col items-center gap-3">
                    <img
                        src={tempPhotoUrl}
                        alt={t('PhotoPreview')}
                        onError={(e) => {
                            e.currentTarget.src = 'https://placehold.co/128x128/ccc/333?text=URL+Inválida';
                        }}
                        className="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-lg"
                    />
                    <p className="text-sm text-gray-500 text-center">
                        {t('PhotoPreviewInfo')}
                    </p>
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="photoUrl" className="font-medium text-gray-700">
                        {t('ImageURL')}
                    </label>
                    <input
                        id="photoUrl"
                        type="url"
                        placeholder={t('EnterPhotoURL')}
                        value={tempPhotoUrl}
                        onChange={(e) => setTempPhotoUrl(e.target.value)}
                        className="border-[1px] border-blue-300 rounded-lg p-3 outline-none w-full focus:ring-2 focus:ring-blue-500 transition duration-150"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition duration-150"
                    >
                        {t('Cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!tempPhotoUrl.trim()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('Save')}
                    </button>
                </div>

            </div>
        </div>
    )
} 