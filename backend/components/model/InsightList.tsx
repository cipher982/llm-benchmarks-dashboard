import React from "react";
import { List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

interface InsightListProps {
    items: string[];
}

const InsightList: React.FC<InsightListProps> = ({ items }) => {
    if (!items.length) return null;

    return (
        <List disablePadding>
            {items.map((item, index) => (
                <ListItem key={`${item}-${index}`} disableGutters sx={{ alignItems: "flex-start" }}>
                    <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                        <CheckCircleOutlineIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText primaryTypographyProps={{ variant: "body1" }} primary={item} />
                </ListItem>
            ))}
        </List>
    );
};

export default InsightList;
