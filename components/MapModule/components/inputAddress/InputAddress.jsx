// Импорт основных хуков React для управления состоянием и жизненным циклом компонента.
import { useState, useEffect } from "react";
// Импорт хранилищ Zustand для глобального управления состоянием геоданных и отображаемого адреса.
import { useGeocodeStore } from "../../store/geocodData";
import { useDisplayAddressStore } from "../../store/displayAddress";
// Импорт сервисных функций для взаимодействия с API адресов.
import { getRegions, searchAddresses } from "../../services/addressService";
// Импорт функции для выполнения запросов геокодирования.
import fetchGeocode from "../../geocode";
// Импорт компонентов из библиотеки Material-UI для построения интерфейса.
import { Autocomplete, TextField, CircularProgress, Box, Typography, Dialog, DialogTitle, List, ListItem, ListItemText, ListItemButton } from "@mui/material";
// Импорт стилей для компонента.
import css from "./InputAddress.module.css";
// Импорт useQuery из TanStack Query для управления серверным состоянием (загрузка, кэширование).
import { useQuery } from "@tanstack/react-query";
// Импорт хука для "отложенного" выполнения (дебаунса) ввода пользователя.
import { useDebounce } from 'use-debounce';

// Название региона, который будет выбран по умолчанию при загрузке.
const DEFAULT_REGION_NAME = "Харківська";

/**
 * Компонент InputAddress предоставляет пользователю интерфейс для выбора адреса
 * с автодополнением, геокодированием и обработкой неоднозначных результатов.
 * @param {object} props - Пропсы компонента.
 * @param {function} props.onAddressSelect - Callback-функция, которая вызывается при выборе
 * и успешном геокодировании адреса. Передает данные адреса родительскому компоненту.
 */
export default function InputAddress({ onAddressSelect }) {
  // Подключение к хранилищам Zustand для обновления глобального состояния.
  const { setGeocodeData } = useGeocodeStore();
  const { setAddressData } = useDisplayAddressStore();
  
  // Загрузка списка регионов с помощью TanStack Query.
  // Данные кэшируются навсегда (staleTime: Infinity), так как они редко меняются.
  const { data: regions = [], isLoading: loadingRegions } = useQuery({
    queryKey: ['regions'],
    queryFn: getRegions,
    staleTime: Infinity,
  });

  // Локальное состояние компонента.
  const [selectedRegion, setSelectedRegion] = useState(null); // Выбранный регион.
  const [selectedAddress, setSelectedAddress] = useState(null); // Выбранный адрес из автодополнения.
  const [inputValue, setInputValue] = useState(""); // Текущее значение в поле ввода адреса.
  
  // Создание "отложенного" значения inputValue. Запрос на поиск будет отправлен только через 500мс после того, как пользователь прекратит ввод.
  const [debouncedInputValue] = useDebounce(inputValue, 500);

  // Запрос на поиск адресов на основе отложенного ввода и выбранного региона.
  const { data: addressOptions = [], isLoading: loadingAddress } = useQuery({
    queryKey: ['addresses', debouncedInputValue, selectedRegion?.level_1_id],
    queryFn: () => searchAddresses(debouncedInputValue, selectedRegion.level_1_id),
    // Запрос выполняется только если введено 3 или более символов и выбран регион.
    enabled: debouncedInputValue.length >= 3 && !!selectedRegion,
    // Результаты поиска кэшируются на 5 минут.
    staleTime: 1000 * 60 * 5,
  });

  // Состояние для обработки неоднозначных результатов геокодирования.
  const [ambiguousResults, setAmbiguousResults] = useState([]); // Список вариантов, если найдено несколько.
  const [showAmbiguousDialog, setShowAmbiguousDialog] = useState(false); // Флаг для отображения диалога выбора.

  // useEffect для установки региона по умолчанию после их загрузки.
  useEffect(() => {
    if (regions && regions.length > 0 && !selectedRegion) {
      const defaultRegion = regions.find(region => region.name === DEFAULT_REGION_NAME);
      if (defaultRegion) {
        setSelectedRegion(defaultRegion);
      }
    }
  }, [regions, selectedRegion]);

  /**
   * Обогащает данные, полученные от геокодера, дополнительной информацией из выбранного элемента.
   * @param {object} geocodedData - Данные от сервиса геокодирования.
   * @param {object} newValue - Объект адреса, выбранный пользователем в автодополнении.
   * @returns {object} - Финальный объект с полными данными об адресе.
   */
  const processGeocodedData = (geocodedData, newValue) => {
    return {
      ...geocodedData,
      address: {
        ...(geocodedData.address || {}),
        country: "Україна",
        state: newValue.region,
        county: newValue.district,
        city: newValue.category === "M" ? newValue.name : geocodedData.address?.city,
        town: newValue.category === "X" ? newValue.name : geocodedData.address?.town,
        village: newValue.category === "C" ? newValue.name : geocodedData.address?.village,
        municipality: newValue.community
      }
    };
  };

  /**
   * Пытается геокодировать адрес, перебирая несколько вариантов написания.
   * @param {string[]} addresses - Массив вариантов адреса для геокодирования.
   * @param {object} newValue - Выбранный пользователем объект адреса.
   * @returns {Promise<boolean>} - true, если геокодирование прошло успешно, иначе false.
   */
  const tryGeocode = async (addresses, newValue) => {
    for (const address of addresses) {
      try {
        const rawGeocodeResult = await fetchGeocode(address);
        
        if (Array.isArray(rawGeocodeResult) && rawGeocodeResult.length > 0) {
          // Если геокодер вернул несколько результатов, показываем диалог для выбора.
          if (rawGeocodeResult.length > 1) {
             setAmbiguousResults(rawGeocodeResult.map(res => processGeocodedData(res, newValue)));
             setShowAmbiguousDialog(true);
             return true; // Считаем успешным, так как предоставили выбор.
          }

          // Если результат один, обрабатываем и сохраняем его.
          const geocodedData = rawGeocodeResult[0];
          const finalData = processGeocodedData(geocodedData, newValue);
          
          setGeocodeData(finalData);
          setAddressData(finalData);
          if (onAddressSelect) onAddressSelect(finalData);
          return true;
        } else if (rawGeocodeResult && !Array.isArray(rawGeocodeResult) && rawGeocodeResult.lat) {
           // Обработка случая, когда результат не массив, а одиночный объект.
           const finalData = processGeocodedData(rawGeocodeResult, newValue);
           setGeocodeData(finalData);
           setAddressData(finalData);
           if (onAddressSelect) onAddressSelect(finalData);
           return true;
        }
      } catch (e) {
        console.warn(`Не удалось геокодировать адрес: ${address}`, e);
      }
    }
    return false; // Все попытки провалились.
  };

  /**
   * Обработчик выбора адреса из списка автодополнения.
   */
  const handleAddressSelect = async (event, newValue) => {
    setSelectedAddress(newValue);
    setAmbiguousResults([]);
    setShowAmbiguousDialog(false);
    
    if (newValue) {
      // Формируем несколько вариантов написания адреса для повышения шансов на успешное геокодирование.
      const addressVariants = [];
      if (newValue.full_address) addressVariants.push(newValue.full_address);
      addressVariants.push(`Україна, ${newValue.region || ""}, ${newValue.district || ""}, ${newValue.community || ""}, ${newValue.name}`);
      if (newValue.community) addressVariants.push(`Україна, ${newValue.region || ""}, ${newValue.district || ""}, ${newValue.name}`);
      if (newValue.district) addressVariants.push(`Україна, ${newValue.region || ""}, ${newValue.name}`);
      addressVariants.push(`Україна, ${newValue.region || ""}, ${newValue.name}`);

      try {
        const success = await tryGeocode(addressVariants, newValue);
        if (!success) throw new Error("Все попытки геокодирования провалились");
      } catch (error) {
        // В случае полной неудачи создаем "заглушку" с нулевыми координатами.
        console.error("Ошибка геокодирования:", error);
        const fallbackData = {
            display_name: newValue.full_address || newValue.name,
            lat: "0",
            lon: "0"
        };
        setGeocodeData(fallbackData);
        setAddressData(fallbackData);
        if (onAddressSelect) onAddressSelect(fallbackData);
      }
    } else {
      // Если поле очищено, сбрасываем данные в хранилищах.
      setGeocodeData({});
      setAddressData({});
      if (onAddressSelect) onAddressSelect(null);
    }
  };

  /**
   * Обработчик выбора одного из неоднозначных результатов в диалоговом окне.
   * @param {object} result - Выбранный пользователем результат.
   */
  const handleAmbiguousSelect = (result) => {
    setGeocodeData(result);
    setAddressData(result);
    if (onAddressSelect) onAddressSelect(result);
    setShowAmbiguousDialog(false);
  };

  // Объект со стилями для кастомизации компонентов Autocomplete от MUI.
  // Использует CSS переменные для поддержки тем.
  const autocompleteSx = {
    "& .MuiOutlinedInput-root": {
      color: "var(--foreground)",
      backgroundColor: "var(--background)",
      "& fieldset": { borderColor: "var(--border-color)" },
      "&:hover fieldset": { borderColor: "var(--foreground)" },
      "&.Mui-focused fieldset": { borderColor: "var(--primary-color)" },
      "&.Mui-disabled fieldset": { borderColor: "var(--border-color)" },
    },
    "& .MuiInputLabel-root": { 
      color: "var(--foreground)", 
      opacity: 0.7,
      backgroundColor: "var(--background)",
      padding: "0 4px"
    },
    "& .MuiInputLabel-root.Mui-focused": { color: "var(--primary-color)", opacity: 1 },
    "& .MuiInputLabel-root.Mui-disabled": { color: "var(--foreground)", opacity: 0.3 },
    "& .MuiSvgIcon-root": { color: "var(--foreground)" },
    "& + .MuiAutocomplete-popper .MuiAutocomplete-paper": {
      backgroundColor: "var(--background)",
      color: "var(--foreground)",
      border: "1px solid var(--border-color)",
    },
    "& + .MuiAutocomplete-popper .MuiAutocomplete-option": {
      color: "var(--foreground)",
      "&:hover": { backgroundColor: "var(--hover-bg-color)" },
      "&[aria-selected='true']": { backgroundColor: "var(--secondary-bg-color)", color: "var(--secondary-text-color)" },
      "&[aria-selected='true']:hover": { backgroundColor: "var(--secondary-hover-color)" },
    },
    "& + .MuiAutocomplete-popper .MuiAutocomplete-noOptions": {
      color: "var(--foreground)",
      backgroundColor: "var(--background)"
    },
    "& + .MuiAutocomplete-popper .MuiAutocomplete-loading": {
      color: "var(--foreground)",
      backgroundColor: "var(--background)"
    }
  };

  return (
    <div className={css.container}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
        {/* Компонент для выбора региона */}
        <Autocomplete
          options={regions}
          getOptionLabel={(option) => option.name}
          value={selectedRegion}
          onChange={(e, v) => {
            setSelectedRegion(v);
            setSelectedAddress(null); // Сбрасываем адрес при смене региона
            setInputValue("");
          }}
          loading={loadingRegions}
          sx={autocompleteSx}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Оберіть область"
              variant="outlined"
              size="small"
              className={css.input}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingRegions ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          slotProps={{ popper: { sx: { zIndex: 10100 } } }}
        />

        {/* Компонент для поиска и выбора населенного пункта */}
        <Autocomplete
          disabled={!selectedRegion} // Неактивен, пока не выбран регион
          options={addressOptions}
          getOptionLabel={(option) => option.full_address || option.name || ""}
          filterOptions={(x) => x} // Отключаем встроенную фильтрацию, так как она происходит на сервере
          autoComplete
          includeInputInList
          filterSelectedOptions
          value={selectedAddress}
          onChange={handleAddressSelect}
          onInputChange={(e, v) => setInputValue(v)}
          loading={loadingAddress}
          noOptionsText="Не знайдено (введіть мінімум 3 літери)"
          sx={autocompleteSx}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Пошук населеного пункту"
              variant="outlined"
              size="small"
              className={css.input}
              fullWidth
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingAddress ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          // Кастомное отображение элемента в списке, чтобы показать название и полный адрес
          renderOption={(props, option) => {
            const { key, ...optionProps } = props;
            return (
              <li key={option.full_address || option.name} {...optionProps}>
                <Box>
                  <Typography variant="body1" sx={{ color: "inherit" }}>{option.name}</Typography>
                  <Typography variant="caption" sx={{ color: "inherit", opacity: 0.7 }}>
                    {option.full_address}
                  </Typography>
                </Box>
              </li>
            );
          }}
          slotProps={{ popper: { sx: { zIndex: 10100 } } }}
        />
      </Box>

      {/* Диалоговое окно для выбора из нескольких найденных вариантов адреса */}
      <Dialog 
        open={showAmbiguousDialog} 
        onClose={() => setShowAmbiguousDialog(false)}
        maxWidth="sm"
        fullWidth
        sx={{ zIndex: 10100 }}
        PaperProps={{
          sx: {
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
            borderRadius: 'var(--modal-border-radius, 8px)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--modal-box-shadow)'
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          Знайдено декілька варіантів
        </DialogTitle>
        <List>
          {ambiguousResults.map((result, index) => (
            <ListItem key={index} disablePadding>
              <ListItemButton 
                onClick={() => handleAmbiguousSelect(result)}
                sx={{ '&:hover': { backgroundColor: 'var(--hover-bg-color)' } }}
              >
                <ListItemText 
                  primary={result.display_name} 
                  secondary={`Координати: ${result.lat}, ${result.lon}`}
                  primaryTypographyProps={{ sx: { color: 'var(--foreground)' } }}
                  secondaryTypographyProps={{ sx: { color: 'var(--foreground)', opacity: 0.7 } }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Dialog>
    </div>
  );
}
