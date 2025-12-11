import PropTypes from 'prop-types'
import { useTheme } from '@mui/material/styles'
import { Avatar, Box, ButtonBase, Switch, Button } from '@mui/material'
import { styled } from '@mui/material/styles'
import LogoutIcon from '@mui/icons-material/Logout'
import { useKeycloak } from '../../../KeycloakContext'
import { useTranslation } from 'react-i18next'
import LogoSection from '../LogoSection'
import GuideMenu from './GuideMenu'

// MUI 风格化开关（如有夜间模式需求，可保留）
const MaterialUISwitch = styled(Switch)(({ theme }) => ({
    width: 62,
    height: 34,
    padding: 7,
    '& .MuiSwitch-switchBase': {
        margin: 1,
        padding: 0,
        transform: 'translateX(6px)',
        '&.Mui-checked': {
            color: '#fff',
            transform: 'translateX(22px)',
            '& .MuiSwitch-thumb:before': {
                backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
                    '#fff'
                )}" d="M4.2 2.5l-.7 1.8-1.8.7 1.8.7.7 1.8.6-1.8L6.7 5l-1.9-.7-.6-1.8zm15 8.3a6.7 6.7 0 11-6.6-6.6 5.8 5.8 0 006.6 6.6z"/></svg>')`
            },
            '& + .MuiSwitch-track': {
                opacity: 1,
                backgroundColor: theme.palette.mode === 'dark' ? '#8796A5' : '#aab4be'
            }
        }
    },
    '& .MuiSwitch-thumb': {
        backgroundColor: theme.palette.mode === 'dark' ? '#003892' : '#001e3c',
        width: 32,
        height: 32,
        '&:before': {
            content: "''",
            position: 'absolute',
            width: '100%',
            height: '100%',
            left: 0,
            top: 0,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
                '#fff'
            )}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`
        }
    },
    '& .MuiSwitch-track': {
        opacity: 1,
        backgroundColor: theme.palette.mode === 'dark' ? '#8796A5' : '#aab4be',
        borderRadius: 20 / 2
    }
}));

const Header = ({ userId }) => {
    const theme = useTheme();
    const { t, i18n } = useTranslation();
    const keycloak = useKeycloak();

    // 语言切换处理
    const handleLanguageChange = (lng) => {
        i18n.changeLanguage(lng);
    };

    // 头像字母渲染保护
    const getAvatarLetters = (uid = '') => {
        if (!uid || typeof uid !== 'string') return 'U';
        if (uid.length === 1) return uid[0].toUpperCase();
        return uid.slice(0, 2).toUpperCase();
    };

    return (
        <>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                }}
            >
                {/* Logo */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        width: 228,
                        [theme.breakpoints.down('md')]: {
                            width: 'auto',
                        },
                    }}
                >
                    <Box component="span" sx={{ display: { xs: 'none', md: 'block' }, flexGrow: 1 }}>
                        <LogoSection />
                    </Box>
                </Box>
                {/* 用户信息 + 控件 */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                    }}
                >
                    <Avatar
                        variant="rounded"
                        sx={{
                            ...theme.typography.commonAvatar,
                            ...theme.typography.mediumAvatar,
                            transition: 'all .2s ease-in-out',
                            background: theme.palette.secondary.light,
                            color: theme.palette.secondary.dark,
                        }}
                        color="inherit"
                    >
                        {getAvatarLetters(userId)}
                    </Avatar>
                    <GuideMenu />
                    {/* 语言切换按钮 */}
                    <Button
                        size="small"
                        variant={i18n.language === 'zh' ? 'contained' : 'outlined'}
                        onClick={() => handleLanguageChange('zh')}
                        sx={{
                            minWidth: 68,      // 宽度保持一致
                            height: 35,
                            fontWeight: 400,   // 字体加粗
                            borderRadius: 2,   // 圆角风格
                            boxShadow: '0 2px 8px 0 #1d5de780', // 可选阴影
                            mr: 1,             // 右边距
                            px: 0,             // 内边距
                            ml: 1
                          }}
                    >
                        中文
                    </Button>
                    <Button
                        sx={{
                            minWidth: 68,      // 宽度保持一致
                            height: 35,
                            fontWeight: 400,   // 字体加粗
                            borderRadius: 2,   // 圆角风格
                            boxShadow: '0 2px 8px 0 #1d5de780', // 可选阴影
                            px: 0,             // 内边距
                          }}
                        variant={i18n.language === 'en' ? 'contained' : 'outlined'}
                        onClick={() => handleLanguageChange('en')}
                    >
                        EN
                    </Button>
                    {/* 登出按钮 */}
                    <ButtonBase onClick={() => keycloak.logout({ redirectUri: window.location.origin })} sx={{ borderRadius: '12px', overflow: 'hidden', ml: 1 }}>
                        <LogoutIcon />
                    </ButtonBase>
                </Box>
            </Box>
        </>
    );
};

Header.propTypes = {
    handleLeftDrawerToggle: PropTypes.func,
    userId: PropTypes.string
};

export default Header;
