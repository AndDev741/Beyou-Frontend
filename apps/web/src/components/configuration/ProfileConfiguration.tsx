import { useTranslation } from "react-i18next";
import { MdCreate } from "react-icons/md";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@beyou/state/rootReducer";
import { useEffect, useState, useRef } from "react";
import { EditUser } from "@beyou/types/user/EditUser";
import editUser from "@beyou/api/user/editUser";
import { nameEnter, phraseAuthorEnter, phraseEnter } from "@beyou/state/user/perfilSlice";
import Button from "../Button";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema } from "@beyou/validation/forms/profileSchemas";
import uploadUserPhoto from "@beyou/api/user/uploadUserPhoto";
import getProfile from "@beyou/api/user/getProfile";
import { hydratePerfil } from "@beyou/state/user/perfilSlice";
import { resolvePhotoUrl } from "../../services/photoUrl";

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

    // Mesma gramática de campo das outras telas: rótulo pequeno em text-2 e
    // input de 13.5px. Aqui era rótulo de 18px, que gritava mais que o título
    // da seção.
    const labelStyle = "mb-1.5 block self-start text-[12.5px] font-semibold text-text-2";
    const inputStyle =
        "w-full rounded-control border border-border bg-surface px-3 py-[9.5px] text-[13.5px] text-text outline-none transition-colors duration-200 placeholder:text-text-3 focus:border-accent focus:ring-[3px] focus:ring-accent-soft";

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
    const currentPhoto = resolvePhotoUrl(photo);

    return (
        // Sem cartão próprio: quem desenha a moldura é a seção da página. A
        // foto e o botão ficam numa linha no topo e os campos ocupam a largura
        // inteira — antes a foto roubava 30% e espremia todos os inputs.
        <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex items-center gap-3.5">
                {/* Sem foto o `alt` vazava do círculo ("erfil"); o fallback é a
                    inicial, como no rodapé da sidebar. */}
                {currentPhoto ? (
                    <img
                        src={currentPhoto}
                        alt={t("Profile")}
                        className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
                    />
                ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xl font-semibold text-accent">
                        {(name || "?").charAt(0).toUpperCase()}
                    </span>
                )}

                <button
                    type="button"
                    onClick={() => setEditPhotoModal(true)}
                    className="flex items-center gap-1.5 rounded-control bg-accent-soft px-3.5 py-2 text-[12.5px] font-semibold text-accent transition-colors duration-200 hover:bg-accent/15"
                >
                    {t("ChangePhotoShort")} <MdCreate aria-hidden="true" />
                </button>
            </div>

            <div className="mt-4">
                <label className={labelStyle} htmlFor="name">{t("Name")}</label>
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
                    <p className="mt-1.5 text-xs text-danger">{errors.name?.message}</p>
                )}
            </div>

            <div className="mt-4">
                <label className={labelStyle} htmlFor="email">{t("Email")}</label>
                <input
                    type="email"
                    placeholder={t("EmailPlaceholder")}
                    value={email}
                    disabled
                    onChange={() => {}}
                    id="email"
                    className={`${inputStyle} cursor-not-allowed text-text-3`}
                />
            </div>

            <div className="mt-4">
                <label className={labelStyle} htmlFor="phrase">{t("Phrase")}</label>
                <Controller
                    control={control}
                    name="phrase"
                    render={({ field }) => (
                        <textarea
                            placeholder={t("PhrasePlaceholder")}
                            id="phrase"
                            rows={2}
                            value={field.value}
                            onChange={field.onChange}
                            className={`${inputStyle} resize-none`}
                        />
                    )}
                />
                {errors.phrase?.message && (
                    <p className="mt-1.5 text-xs text-danger">{errors.phrase?.message}</p>
                )}
            </div>

            <div className="mt-4">
                <label className={labelStyle} htmlFor="author">{t("Author")}</label>
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
                    <p className="mt-1.5 text-xs text-danger">{errors.phrase_author?.message}</p>
                )}
            </div>

            {successPhrase && <p className="mt-2 text-xs text-success">{successPhrase}</p>}
            {errorMessage && <p className="mt-2 text-xs text-danger">{errorMessage}</p>}

            <div className="mt-[18px] flex justify-end">
                <Button
                    text={t("SaveProfile")}
                    mode="primary"
                    size="medium"
                    type="submit"
                    disabled={hasErrors}
                />
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
        </form>
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
    const objectUrlRef = useRef<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>(currentPhotoUrl);
    const [error, setError] = useState<string>('');
    const [uploading, setUploading] = useState(false);

    // Release the last created object URL when the modal unmounts.
    useEffect(() => () => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    }, []);

    const validateFile = (file: File): string | null => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            return t('PHOTO_UPLOAD_INVALID_TYPE');
        }
        if (file.size > MAX_SIZE) {
            return t('PHOTO_UPLOAD_TOO_LARGE');
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
        // Revoke the previous preview blob before replacing it.
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;
        setPreviewUrl(url);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError(t('PHOTO_UPLOAD_NO_FILE'));
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

        // Re-fetch profile — the served photo URL is versioned by the backend
        // (?v=<file-mtime>), so hydrate alone busts the image cache on change.
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
            <div className="bg-surface rounded-card p-6 w-[90%] max-w-md shadow-2xl">
                <h3 className="text-lg font-semibold text-text mb-4">{t('ChangePhoto')}</h3>

                <div className="flex flex-col items-center gap-4">
                    <img
                        src={previewUrl}
                        alt={t('PhotoPreview')}
                        onError={(e) => {
                            e.currentTarget.src = 'https://placehold.co/128x128/ccc/333?text=No+Image';
                        }}
                        className="w-32 h-32 rounded-full object-cover border-4 border-border shadow-lg"
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
                        className="px-4 py-2 bg-accent text-on-accent rounded-control hover:opacity-90 transition"
                    >
                        {t('ChooseFile')}
                    </button>

                    {error && (
                        <p className="text-danger text-sm text-center">{error}</p>
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-text hover:bg-surface rounded-control transition"
                    >
                        {t('Cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleUpload}
                        disabled={uploading || !selectedFile}
                        className="px-4 py-2 bg-accent text-on-accent rounded-control hover:opacity-90 transition disabled:opacity-50"
                    >
                        {uploading ? t('PhotoUploading') : t('Save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
