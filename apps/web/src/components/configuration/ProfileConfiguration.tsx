import { useTranslation } from "react-i18next";
import { MdCreate } from "react-icons/md";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@beyou/state/rootReducer";
import { useEffect, useState, useRef } from "react";
import { EditUser } from "@beyou/types/user/EditUser";
import editUser from "@beyou/api/user/editUser";
import { nameEnter, phraseAuthorEnter, phraseEnter } from "@beyou/state/user/perfilSlice";
import SmallButton from "../SmallButton";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema } from "@beyou/validation/forms/profileSchemas";
import uploadUserPhoto from "@beyou/api/user/uploadUserPhoto";
import getProfile from "@beyou/api/user/getProfile";
import { hydratePerfil } from "@beyou/state/user/perfilSlice";

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

type ProfileFormValues = {
    name: string;
    phrase: string;
    phrase_author: string;
};

export default function ProfileConfiguration() {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const name = useSelector((state: RootState) => state.perfil.username) ?? "";
    const email = useSelector((state: RootState) => state.perfil.email) ?? "";
    const photo = useSelector((state: RootState) => state.perfil.photo) ?? "";
    const phrase = useSelector((state: RootState) => state.perfil.phrase) ?? "";
    const phrase_author = useSelector((state: RootState) => state.perfil.phrase_author) ?? "";

    const [editPhotoModal, setEditPhotoModal] = useState(false);
    const [successPhrase, setSuccessPhrase] = useState("");
    const [errorMessage, setErrorMessage] = useState<string>("");

    const {
        control,
        handleSubmit,
        setError,
        reset,
        formState: { errors }
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema(t)),
        mode: "onBlur",
        defaultValues: {
            name,
            phrase,
            phrase_author
        }
    });

    useEffect(() => {
        reset({
            name,
            phrase,
            phrase_author
        });
    }, [name, phrase, phrase_author, reset]);

    const labelStyle = "mb-1 font-medium text-lg self-start text-secondary";
    const inputStyle =
        "border border-primary rounded-md pl-2 outline-none w-full mb-2 bg-background text-secondary placeholder:text-placeholder transition-colors duration-200";

    const resetErrorAndSuccessMessage = () => {
        setErrorMessage("");
        setSuccessPhrase("");
    };

    const onSubmit = async (values: ProfileFormValues) => {
        resetErrorAndSuccessMessage();

        const sanitizedName = values.name.trim();
        const sanitizedPhrase = values.phrase.trim();
        const sanitizedPhraseAuthor = values.phrase_author.trim();

        const editUserDTO: EditUser = {
            name: sanitizedName,
            phrase: sanitizedPhrase,
            phrase_author: sanitizedPhraseAuthor
        };

        const response = await editUser(editUserDTO);

        if (response.error) {
            console.error(response.error);
            const details = response.error.details;
            if (details) {
                if (details.name) setError("name", { message: details.name });
                if (details.phrase) setError("phrase", { message: details.phrase });
                if (details.phrase_author) setError("phrase_author", { message: details.phrase_author });
            }
            const friendlyMessage = getFriendlyErrorMessage(t, response.error);
            setErrorMessage(friendlyMessage);
            toast.error(friendlyMessage);
        } else {
            setSuccessPhrase(t("SuccessEditProfile"));
            toast.success(t("SuccessEditProfile"));

            dispatch(nameEnter(sanitizedName));
            dispatch(phraseEnter(sanitizedPhrase));
            dispatch(phraseAuthorEnter(sanitizedPhraseAuthor));
        }
    };

    const hasErrors = Object.values(errors).some(Boolean);
    const currentPhoto = photo;

    return (
        <div className="w-full h-full flex flex-col justify-start items-start p-2 md:p-4 bg-background text-secondary transition-colors duration-200 rounded-lg shadow-sm">
            <form className="w-full flex items-center" onSubmit={handleSubmit(onSubmit)}>
                <div
                    className="w-[30%] lg:w-[25%] flex flex-col items-center mb-10 pr-2 md:pr-0"
                    onClick={() => setEditPhotoModal(true)}
                >
                    <img
                        src={currentPhoto}
                        alt={t("Profile")}
                        className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-2 border-primary shadow-lg"
                    />

                    <label className="font-medium text-center text-primary flex items-center gap-1 cursor-pointer underline">
                        Change Photo <MdCreate />
                    </label>
                </div>

                <div className="w-[80%] lg:w-[75%] flex flex-col items-end">
                    <label className={labelStyle} htmlFor="name">
                        {t("Name")}
                    </label>
                    <Controller
                        control={control}
                        name="name"
                        render={({ field }) => (
                            <input
                                type="text"
                                placeholder={t("NamePlaceholder")}
                                value={field.value}
                                onChange={field.onChange}
                                id="name"
                                className={inputStyle}
                            />
                        )}
                    />
                    {errors.name?.message && (
                        <p className="text-xs text-error self-start mb-2">{errors.name?.message}</p>
                    )}

                    <label className={labelStyle} htmlFor="email">
                        {t("Email")}
                    </label>
                    <input
                        type="email"
                        placeholder={t("EmailPlaceholder")}
                        value={email}
                        disabled
                        onChange={() => {}}
                        id="email"
                        className={`${inputStyle} text-description cursor-not-allowed`}
                    />

                    <label className={labelStyle} htmlFor="phrase">
                        {t("Phrase")}
                    </label>
                    <Controller
                        control={control}
                        name="phrase"
                        render={({ field }) => (
                            <textarea
                                placeholder={t("PhrasePlaceholder")}
                                id="phrase"
                                value={field.value}
                                onChange={field.onChange}
                                className={inputStyle}
                            />
                        )}
                    />
                    {errors.phrase?.message && (
                        <p className="text-xs text-error self-start mb-2">{errors.phrase?.message}</p>
                    )}

                    <label className={labelStyle} htmlFor="author">
                        {t("Author")}
                    </label>
                    <Controller
                        control={control}
                        name="phrase_author"
                        render={({ field }) => (
                            <input
                                type="text"
                                placeholder={t("AuthorPlaceholder")}
                                id="author"
                                value={field.value}
                                onChange={field.onChange}
                                className={inputStyle}
                            />
                        )}
                    />
                    {errors.phrase_author?.message && (
                        <p className="text-xs text-error self-start mb-2">{errors.phrase_author?.message}</p>
                    )}
                </div>
            </form>
            <div className="flex flex-col items-center justify-center w-full pt-2">
                <SmallButton text={t("Save")} disabled={hasErrors} onClick={handleSubmit(onSubmit)} />
                <p className="text-success">{successPhrase}</p>
                {errorMessage && <p className="text-error text-xs">{errorMessage}</p>}
            </div>
            {editPhotoModal && (
                <EditPhoto
                    currentPhotoUrl={currentPhoto}
                    onSave={() => {
                        resetErrorAndSuccessMessage();
                        setSuccessPhrase(t("SuccessEditProfile"));
                        setTimeout(() => setSuccessPhrase(""), 5000);
                    }}
                    onClose={() => setEditPhotoModal(false)}
                />
            )}
        </div>
    );
}

function EditPhoto({
    currentPhotoUrl,
    onSave,
    onClose,
}: {
    currentPhotoUrl: string;
    onSave: () => void;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>(currentPhotoUrl);
    const [error, setError] = useState<string>('');
    const [uploading, setUploading] = useState(false);

    const validateFile = (file: File): string | null => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            return t('PhotoUploadInvalidType');
        }
        if (file.size > MAX_SIZE) {
            return t('PhotoUploadTooLarge');
        }
        return null;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }
        setError('');
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError(t('PhotoUploadNoFile'));
            return;
        }
        setUploading(true);
        setError('');

        const response = await uploadUserPhoto(selectedFile);
        if (response.error) {
            setError(getFriendlyErrorMessage(t, response.error));
            setUploading(false);
            return;
        }

        // Re-fetch profile to get updated photo URL
        const profileRes = await getProfile();
        if (profileRes.data) {
            dispatch(hydratePerfil(profileRes.data));
        }

        setUploading(false);
        onSave();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background rounded-2xl p-6 w-[90%] max-w-md shadow-2xl">
                <h3 className="text-lg font-semibold text-secondary mb-4">{t('ChangePhoto')}</h3>

                <div className="flex flex-col items-center gap-4">
                    <img
                        src={previewUrl}
                        alt={t('PhotoPreview')}
                        onError={(e) => {
                            e.currentTarget.src = 'https://placehold.co/128x128/ccc/333?text=No+Image';
                        }}
                        className="w-32 h-32 rounded-full object-cover border-4 border-primary shadow-lg"
                    />

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition"
                    >
                        {selectedFile ? selectedFile.name : t('ChooseFile')}
                    </button>

                    {error && (
                        <p className="text-error text-sm text-center">{error}</p>
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-secondary hover:bg-surface rounded-lg transition"
                    >
                        {t('Cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleUpload}
                        disabled={uploading || !selectedFile}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
                    >
                        {uploading ? t('PhotoUploading') : t('Save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
