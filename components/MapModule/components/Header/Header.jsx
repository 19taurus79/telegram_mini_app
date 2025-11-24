import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

export default function Header({
  onLoadDataClick,
  isDataTopVisible,
  onToggleAddressSearch,
  isAddressSearchVisible,
  onToggleApplications,
  areApplicationsVisible,
}) {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLoadData = () => {
    onLoadDataClick();
    handleClose();
  };

  const handleToggleAddress = () => {
    onToggleAddressSearch();
    handleClose();
  };

  const handleToggleApps = () => {
    onToggleApplications();
    handleClose();
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={handleClick}
          >
            <MenuIcon />
          </IconButton>
          <Menu
            id="basic-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              "aria-labelledby": "basic-button",
            }}
          >
            <MenuItem onClick={handleLoadData}>
              {isDataTopVisible ? "Скрыть данные" : "Показать данные"}
            </MenuItem>
            <MenuItem onClick={handleToggleAddress}>
              {isAddressSearchVisible
                ? "Скрыть поиск адреса"
                : "Показать поиск адреса"}
            </MenuItem>
            <MenuItem onClick={handleToggleApps}>
              {areApplicationsVisible ? "Скрыть заявки" : "Показать заявки"}
            </MenuItem>
          </Menu>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Leaflet Map
          </Typography>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
