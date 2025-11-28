import { useState, useEffect } from "react";
import { useGeocodeStore } from "../../store/geocodData";
import { useDisplayAddressStore } from "../../store/displayAddress";
import { getRegions, searchAddresses } from "../../services/addressService";
import fetchGeocode from "../../geocode";
import { Autocomplete, TextField, CircularProgress, Box, Typography } from "@mui/material";
import css from "./InputAddress.module.css";

export default function InputAddress({ onAddressSelect }) {
  const { setGeocodeData } = useGeocodeStore();
  const { setAddressData } = useDisplayAddressStore();
  
  // Region state
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [loadingRegions, setLoadingRegions] = useState(false);

  // Address state
  const [addressOptions, setAddressOptions] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Load regions on mount
  useEffect(() => {
    async function loadRegions() {
      setLoadingRegions(true);
      try {
        const data = await getRegions();
        setRegions(data);
      } catch (e) {
        console.error("Failed to load regions", e);
      }
      setLoadingRegions(false);
    }
    loadRegions();
  }, []);

  // Search addresses
  useEffect(() => {
    let active = true;

    if (inputValue.length < 3 || !selectedRegion) {
      setAddressOptions(selectedAddress ? [selectedAddress] : []);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingAddress(true);
      try {
        const results = await searchAddresses(inputValue, selectedRegion.level_1_id);
        if (active) {
          setAddressOptions(results);
        }
      } catch (e) {
        console.error(e);
      }
      setLoadingAddress(false);
    }, 500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [inputValue, selectedRegion, selectedAddress]);

  // Handle selection
  const handleAddressSelect = async (event, newValue) => {
    setSelectedAddress(newValue);
    
    if (newValue) {
      const addressToGeocode = newValue.full_address || 
        `Україна, ${newValue.region || ""}, ${newValue.district || ""}, ${newValue.community || ""}, ${newValue.name}`;

      try {
        const rawGeocodeResult = await fetchGeocode(addressToGeocode);
        const geocodedData = Array.isArray(rawGeocodeResult) ? rawGeocodeResult[0] : rawGeocodeResult;

        if (!geocodedData) throw new Error("No geocode results");

        const finalData = {
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

        setGeocodeData(finalData);
        setAddressData(finalData);

        // Call the parent callback if provided
        if (onAddressSelect) {
          onAddressSelect(finalData);
        }

      } catch (error) {
        console.error("Geocoding failed:", error);
        const fallbackData = {
            display_name: newValue.full_address,
            lat: "0",
            lon: "0"
        };
        setGeocodeData(fallbackData);
        setAddressData(fallbackData);
        
        if (onAddressSelect) {
          onAddressSelect(fallbackData);
        }
      }
    } else {
      setGeocodeData({});
      setAddressData({});
      if (onAddressSelect) {
        onAddressSelect(null);
      }
    }
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
            setAddressOptions([]);
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
          slotProps={{
            popper: {
              sx: { zIndex: 10100 }
            }
          }}
        />

        <Autocomplete
          disabled={!selectedRegion}
          options={addressOptions}
          getOptionLabel={(option) => {
             if (typeof option === 'string') return option;
             return option.full_address || option.name;
          }}
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
              <li key={key || option.full_address} {...optionProps}>
                <Box>
                  <Typography variant="body1" sx={{ color: "inherit" }}>{option.name}</Typography>
                  <Typography variant="caption" sx={{ color: "inherit", opacity: 0.7 }}>
                    {option.full_address}
                  </Typography>
                </Box>
              </li>
            );
          }}
          slotProps={{
            popper: {
              sx: { zIndex: 10100 }
            }
          }}
        />
      </Box>
    </div>
  );
}
