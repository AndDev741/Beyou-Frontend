// functions
import registerRequest from "./request/registerRequest";
// services
import { successRegisterEnter } from "../../redux/authentication/registerSlice";
// types
import { TFunction } from "i18next";
import { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import { NavigateFunction } from "react-router-dom";
import { defaultErrorEnter } from "../../redux/errorHandler/errorHandlerSlice";

export default async function handleRegister(
    name: string,
    email: string,
    password: string,
    t: TFunction,
    dispatch: Dispatch<UnknownAction>,
    navigate: NavigateFunction
): Promise<string | null> {
    const response = await registerRequest(name, email, password);
    if (response.success) {
        dispatch(successRegisterEnter(true));
        dispatch(defaultErrorEnter(""));
        navigate("/");
        return null;
    }
    if (response.error) {
        return t("EmailInUseError");
    }
    return t("UnkownError");
}
