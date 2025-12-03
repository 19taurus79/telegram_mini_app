import { useState, useEffect } from "react";
import { useGeocodeStore } from "../../store/geocodData";
import { useDisplayAddressStore } from "../../store/displayAddress";
import { getRegions, searchAddresses } from "../../services/addressService";
import fetchGeocode from "../../geocode";
import { Autocomplete, TextField, CircularProgress, Box, Typography, Dialog, DialogTitle, List, ListItem, ListItemText, ListItemButton } from "@mui/material";
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

  // Ambiguous results state
  const [ambiguousResults, setAmbiguousResults] = useState([]);
  const [showAmbiguousDialog, setShowAmbiguousDialog] = useState(false);

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

  // Helper to process geocoded data
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

  // Recursive geocoding function with fallback
  const tryGeocode = async (addresses, newValue) => {
    for (const address of addresses) {
      try {
        console.log("Trying to geocode:", address);
        const rawGeocodeResult = await fetchGeocode(address);
        
        if (Array.isArray(rawGeocodeResult) && rawGeocodeResult.length > 0) {
          // Если найдено несколько результатов и это не самый точный поиск (по полному адресу)
          // или если результаты существенно отличаются (например, разные координаты)
          if (rawGeocodeResult.length > 1) {
             console.log("Found multiple results:", rawGeocodeResult);
             setAmbiguousResults(rawGeocodeResult.map(res => processGeocodedData(res, newValue)));
             setShowAmbiguousDialog(true);
             return true; // Stop processing, wait for user selection
          }

          const geocodedData = rawGeocodeResult[0];
          const finalData = processGeocodedData(geocodedData, newValue);
          
          setGeocodeData(finalData);
          setAddressData(finalData);
          if (onAddressSelect) onAddressSelect(finalData);
          return true; // Success
        } else if (rawGeocodeResult && !Array.isArray(rawGeocodeResult) && rawGeocodeResult.lat) {
           // Single object result
           const finalData = processGeocodedData(rawGeocodeResult, newValue);
           setGeocodeData(finalData);
           setAddressData(finalData);
           if (onAddressSelect) onAddressSelect(finalData);
           return true;
        }
      } catch (e) {
        console.warn(`Failed to geocode address: ${address}`, e);
        // Continue to next address variant
      }
    }
    return false; // All attempts failed
  };

  // Handle selection
  const handleAddressSelect = async (event, newValue) => {
    setSelectedAddress(newValue);
    setAmbiguousResults([]);
    setShowAmbiguousDialog(false);
    
    if (newValue) {
      // Create address variants from most specific to least specific
      const addressVariants = [];
      
      // 1. Full address from object if available
      if (newValue.full_address) {
        addressVariants.push(newValue.full_address);
      }

      // 2. Constructed full address
      addressVariants.push(`Україна, ${newValue.region || ""}, ${newValue.district || ""}, ${newValue.community || ""}, ${newValue.name}`);

      // 3. Without community (often redundant or missing in geocoder)
      if (newValue.community) {
        addressVariants.push(`Україна, ${newValue.region || ""}, ${newValue.district || ""}, ${newValue.name}`);
      }

      // 4. Without district (some cities are districts themselves)
      if (newValue.district) {
        addressVariants.push(`Україна, ${newValue.region || ""}, ${newValue.name}`);
      }

      // 5. Just name and region
      addressVariants.push(`Україна, ${newValue.region || ""}, ${newValue.name}`);

      try {
        const success = await tryGeocode(addressVariants, newValue);

        if (!success) {
          throw new Error("All geocode attempts failed");
        }

      } catch (error) {
        console.error("Geocoding failed:", error);
        const fallbackData = {
            display_name: newValue.full_address || newValue.name,
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

      <Dialog 
        open={showAmbiguousDialog} 
        onClose={() => setShowAmbiguousDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Знайдено декілька варіантів</DialogTitle>
        <List>
          {ambiguousResults.map((result, index) => (
            <ListItem key={index} disablePadding>
              <ListItemButton onClick={() => handleAmbiguousSelect(result)}>
                <ListItemText 
                  primary={result.display_name} 
                  secondary={`Координати: ${result.lat}, ${result.lon}`} 
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Dialog>
    </div>
  );
}
