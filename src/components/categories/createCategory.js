import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import addIcon from '../../assets/addIcon.svg';
import iconRender from './iconsRender';
import Button from '../button';

function CreateCategory(){
    const {t} = useTranslation();
    const labelCss = "text-blueMain text-2xl md:text-xl";
    const borderCss = "border-solid border-[1px] border-blueMain rounded-md w-[90vw] h-[50px] md:w-[320px] lg:w-[15rem]";

    const [search, setSearch] = useState("");
    const [icons, setIcons] = useState([]);
    const [selectIcon, setSelectIcon] = useState(null);
    console.log(selectIcon)

    useEffect(() => {
        setIcons((icons) => iconRender(search, selectIcon, icons));
    }, [search, selectIcon])
    return(
        <div>
            <div className='flex items-center justify-center text-3xl mt-6 font-semibold'>
                <img className='w-[40px] mr-1'
                alt={t('CreateCategoryImgAlt')} 
                src={addIcon}/>
                <h2>{t('CreateCategory')}</h2>
            </div>
            <form className='flex flex-col mt-8 '>
                <div className='flex flex-col items-center md:items-start md:flex-row justify-center'>
                    <div className='flex flex-col md:items-start mx-5'>
                        <label htmlFor='name' 
                        className={labelCss}>{t('Name')}</label>
                        <input
                        name='name'
                        id='name'
                        placeholder={t('CategoryNamePlaceholder')}
                        className={`${borderCss} h-[40px] outline-none pl-2 text-lg`}/>
                        
                        <label htmlFor='description' 
                        className={`${labelCss} mt-2`}>
                            {t('Description')}
                        </label>
                        
                        <textarea id='description'
                        name='description'
                        placeholder={t('DescriptionPlaceholder')}
                        className={`${borderCss} outline-none text-lg p-1 min-h-[84px] lg:min-h-[90px]`}
                        />

                        <label htmlFor='experience' 
                        className={`${labelCss} mt-2`}>{t('YourExperience')}</label>
                        <select id='experience'
                        name='experience'
                        className={`${borderCss} h-[50px] text-xl pl-1 outline-none`}>
                            <option>{t("Begginer")}</option>
                            <option>{t('Intermediary')}</option>
                            <option>{t('Advanced')}</option>
                        </select>
                    </div>
                    <div className='flex flex-col mt-2 md:mt-0'>
                        <div className='flex'>
                            <label htmlFor='icon'
                            className={labelCss}>{t('Icon')}</label>
                            <input 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            name='icon'
                            className='md:w-[190px] ml-1 pl-1 border-[1px] rounded-md outline-none'
                            placeholder={t('IconPlaceholder')}
                            />
                        </div>
                        <div className={`flex flex-wrap items-start justify-start overflow-auto ${borderCss} min-h-[200px] md:h-[255px] lg:h-[262px] p-2`}>
                            {icons.map((index) => (
                                <p onClick={() => setSelectIcon(index.name)}
                                key={index.name}
                                className={`${index.name === selectIcon ? "scale-110 text-blueMain border-2 border-blueMain rounded-md" : "text-gray-500 "}
                                text-4xl m-1 hover:text-blueMain hover:scale-105 cursor-pointer`}>
                                    <index.IconComponent/>
                                </p>
                            ))}
                        </div>
                    </div>
                </div> 
                <div className='flex items-center justify-center mt-6'>
                    <Button text={t('Create')} />
                </div>
            </form>
        </div>
    )
}

export default CreateCategory;