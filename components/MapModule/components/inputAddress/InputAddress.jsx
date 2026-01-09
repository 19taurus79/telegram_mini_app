import { useState, useEffect } from "react";
import { useGeocodeStore } from "../../store/geocodData";
import { useDisplayAddressStore } from "../../store/displayAddress";
import { getRegions, searchAddresses } from "../../services/addressService";
import fetchGeocode from "../../geocode";
import { Autocomplete, TextField, CircularProgress, Box, Typography, Dialog, DialogTitle, List, ListItem, ListItemText, ListItemButton } from "@mui/material";
import css from "./InputAddress.module.css";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from 'use-debounce';

const DEFAULT_REGION_NAME = "Харківська";

export default function InputAddress({ onAddressSelect }) {
  const { setGeocodeData } = useGeocodeStore();
  const { setAddressData } = useDisplayAddressStore();
  
  const { data: regions = [], isLoading: loadingRegions } = useQuery({
    queryKey: ['regions'],
    queryFn: getRegions,
    staleTime: Infinity,
  });

  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [debouncedInputValue] = useDebounce(inputValue, 500);

  const { data: addressOptions = [], isLoading: loadingAddress } = useQuery({
    queryKey: ['addresses', debouncedInputValue, selectedRegion?.level_1_id],
    queryFn: () => searchAddresses(debouncedInputValue, selectedRegion.level_1_id),
    enabled: debouncedInputValue.length >= 3 && !!selectedRegion,
    staleTime: 1000 * 60 * 5, // Кэшируем результаты поиска на 5 минут
  });

  const [ambiguousResults, setAmbiguousResults] = useState([]);
  const [showAmbiguousDialog, setShowAmbiguousDialog] = useState(false);

  useEffect(() => {
    // Ждем, пока useQuery закончит загрузку и в regions появятся данные
    if (regions && regions.length > 0) {
      // Проверяем, не выбран ли уже регион (включая ручной выбор пользователя)
      if (!selectedRegion) {
        const defaultRegion = regions.find(region => region.name === DEFAULT_REGION_NAME);
        if (defaultRegion) {
          setSelectedRegion(defaultRegion);
        }
      }
    }
  }, [regions, selectedRegion]);

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

  const tryGeocode = async (addresses, newValue) => {
    for (const address of addresses) {
      try {
        const rawGeocodeResult = await fetchGeocode(address);
        
        if (Array.isArray(rawGeocodeResult) && rawGeocodeResult.length > 0) {
          if (rawGeocodeResult.length > 1) {
             setAmbiguousResults(rawGeocodeResult.map(res => processGeocodedData(res, newValue)));
             setShowAmbiguousDialog(true);
             return true; 
          }

          const geocodedData = rawGeocodeResult[0];
          const finalData = processGeocodedData(geocodedData, newValue);
          
          setGeocodeData(finalData);
          setAddressData(finalData);
          if (onAddressSelect) onAddressSelect(finalData);
          return true;
        } else if (rawGeocodeResult && !Array.isArray(rawGeocodeResult) && rawGeocodeResult.lat) {
           const finalData = processGeocodedData(rawGeocodeResult, newValue);
           setGeocodeData(finalData);
           setAddressData(finalData);
           if (onAddressSelect) onAddressSelect(finalData);
           return true;
        }
      } catch (e) {
        console.warn(`Failed to geocode address: ${address}`, e);
      }
    }
    return false;
  };

  const handleAddressSelect = async (event, newValue) => {
    setSelectedAddress(newValue);
    setAmbiguousResults([]);
    setShowAmbiguousDialog(false);
    
    if (newValue) {
      const addressVariants = [];
      if (newValue.full_address) addressVariants.push(newValue.full_address);
      addressVariants.push(`Україна, ${newValue.region || ""}, ${newValue.district || ""}, ${newValue.community || ""}, ${newValue.name}`);
      if (newValue.community) addressVariants.push(`Україна, ${newValue.region || ""}, ${newValue.district || ""}, ${newValue.name}`);
      if (newValue.district) addressVariants.push(`Україна, ${newValue.region || ""}, ${newValue.name}`);
      addressVariants.push(`Україна, ${newValue.region || ""}, ${newValue.name}`);

      try {
        const success = await tryGeocode(addressVariants, newValue);
        if (!success) throw new Error("All geocode attempts failed");
      } catch (error) {
        console.error("Geocoding failed:", error);
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
      setGeocodeData({});
      setAddressData({});
      if (onAddressSelect) onAddressSelect(null);
    }
  };

  const handleAmbiguousSelect = (result) => {
    setGeocodeData(result);
    setAddressData(result);
    if (onAddressSelect) onAddressSelect(result);
    setShowAmbiguousDialog(false);
  };

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
        <Autocomplete
          options={regions}
          getOptionLabel={(option) => option.name}
          value={selectedRegion}
          onChange={(e, v) => {
            setSelectedRegion(v);
            setSelectedAddress(null);
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

        <Autocomplete
          disabled={!selectedRegion}
          options={addressOptions}
          getOptionLabel={(option) => option.full_address || option.name || ""}
          filterOptions={(x) => x}
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
