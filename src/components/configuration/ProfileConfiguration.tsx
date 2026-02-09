import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { MdClose, MdCreate } from "react-icons/md";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../redux/rootReducer";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { EditUser } from "../../types/user/EditUser";
import editUser from "../../services/user/editUser";
import { nameEnter, photoEnter, phraseAuthorEnter, phraseEnter } from "../../redux/user/perfilSlice";
import SmallButton from "../SmallButton";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage } from "../../services/apiError";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, photoUrlSchema } from "../../validation/forms/profileSchemas";

type ProfileFormValues = {
    name: string;
    photo: string;
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
        watch,
        formState: { errors }
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema(t)),
        mode: "onBlur",
        defaultValues: {
            name,
            photo,
            phrase,
            phrase_author
        }
    });

    useEffect(() => {
        reset({
            name,
            photo,
            phrase,
            phrase_author
        });
    }, [name, photo, phrase, phrase_author, reset]);

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
        const sanitizedPhoto = values.photo.trim();
        const sanitizedPhrase = values.phrase.trim();
        const sanitizedPhraseAuthor = values.phrase_author.trim();

        const editUserDTO: EditUser = {
            name: sanitizedName,
            photo: sanitizedPhoto,
            phrase: sanitizedPhrase,
            phrase_author: sanitizedPhraseAuthor
        };

        const response = await editUser(editUserDTO);

        if (response.error) {
            console.error(response.error);
            const details = response.error.details;
            if (details) {
                if (details.name) setError("name", { message: details.name });
                if (details.photo) setError("photo", { message: details.photo });
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
            dispatch(photoEnter(sanitizedPhoto));
        }
    };

    const hasErrors = Object.values(errors).some(Boolean);
    const currentPhoto = watch("photo") || "";

    return (
        <div className="w-full h-full flex flex-col justify-start items-start p-2 md:p-4 bg-background text-secondary transition-colors duration-200 rounded-lg shadow-sm">
            <h1 className="text-2xl font-semibold mb-4">{t("Profile")}</h1>
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
                    {errors.photo?.message && (
                        <p className="text-xs text-error mt-1 text-center">{errors.photo?.message}</p>
                    )}
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
            <div className={`${editPhotoModal ? "block" : "hidden"}`}>
                <EditPhotoUrl
                    setEditPhotoModal={setEditPhotoModal}
                    currentPhotoUrl={currentPhoto}
                    onSave={(value) => {
                        resetErrorAndSuccessMessage();
                        reset({
                            name: watch("name"),
                            photo: value,
                            phrase: watch("phrase"),
                            phrase_author: watch("phrase_author")
                        });
                    }}
                    t={t}
                />
            </div>
        </div>
    );
}

type EditPhotoUrlProps = {
    setEditPhotoModal: Dispatch<SetStateAction<boolean>>;
    currentPhotoUrl: string;
    onSave: (value: string) => void;
    t: TFunction;
};

function EditPhotoUrl({ setEditPhotoModal, currentPhotoUrl, onSave, t }: EditPhotoUrlProps) {
    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors }
    } = useForm<{ photo: string }>({
        resolver: zodResolver(photoUrlSchema(t)),
        mode: "onBlur",
        defaultValues: {
            photo: currentPhotoUrl || ""
        }
    });

    useEffect(() => {
        reset({ photo: currentPhotoUrl || "" });
    }, [currentPhotoUrl, reset]);

    const photoValue = watch("photo") || "";

    const onSubmit = (values: { photo: string }) => {
        onSave(values.photo.trim());
        setEditPhotoModal(false);
    };

    const handleClose = () => {
        reset({ photo: currentPhotoUrl || "" });
        setEditPhotoModal(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-background text-secondary border border-primary/20 rounded-xl shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4 transform transition-all duration-300 scale-100">
                <div className="flex justify-between items-center border-b pb-3">
                    <h2 className="text-xl font-bold">{t("ChangeProfilePhoto")}</h2>
                    <button
                        onClick={handleClose}
                        className="text-description hover:text-error transition duration-150"
                        aria-label={t("Close")}
                    >
                        <MdClose size={24} />
                    </button>
                </div>

                <div className="flex flex-col items-center gap-3">
                    <img
                        src={photoValue}
                        alt={t("PhotoPreview")}
                        onError={(e) => {
                            e.currentTarget.src = "https://placehold.co/128x128/ccc/333?text=URL+Inv\u00e1lida";
                        }}
                        className="w-32 h-32 rounded-full object-cover border-4 border-primary shadow-lg"
                    />
                    <p className="text-sm text-description text-center">{t("PhotoPreviewInfo")}</p>
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="photoUrl" className="font-medium text-secondary">
                        {t("ImageURL")}
                    </label>
                    <input
                        id="photoUrl"
                        type="url"
                        placeholder={t("EnterPhotoURL")}
                        {...register("photo")}
                        className="border border-primary rounded-lg p-3 outline-none w-full bg-background text-secondary placeholder:text-placeholder focus:ring-2 focus:ring-primary/40 transition duration-150"
                    />
                    {errors.photo?.message && (
                        <p className="text-xs text-error mt-1">{errors.photo?.message}</p>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-secondary border border-primary/20 rounded-lg hover:bg-secondary/10 transition duration-150"
                    >
                        {t("Cancel")}
                    </button>
                    <SmallButton
                        text={t("Save")}
                        disabled={!photoValue?.trim() || Boolean(errors.photo?.message)}
                        onClick={handleSubmit(onSubmit)}
                    />
                </div>
            </div>
        </div>
    );
}
