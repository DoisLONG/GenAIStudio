import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import moment from 'moment'
import { styled } from '@mui/material/styles'
import {
    Button,
    CircularProgress,
    Paper,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Tooltip,
    Typography,
    Menu,
    MenuItem,
    useTheme,
} from '@mui/material'
import { tableCellClasses } from '@mui/material/TableCell'
import FlowListMenu from '../button/FlowListMenu'
import { Link } from 'react-router-dom'
import {
    OpenInNew,
    StopCircleOutlined,
    PlayCircleOutline,
    Analytics,
    ViewTimelineOutlined,
    InstallDesktopOutlined,
    TroubleshootOutlined,
    TerminalOutlined
} from '@mui/icons-material'
import BuildDeploymentPackageDialog from '../dialog/BuildDeploymentPackageDialog'
import OneClickDeploymentDialog from '../dialog/OneClickDeploymentDialog'
import chatflowsApi from '@/api/chatflows'
import config from '@/config'
import { useTranslation } from 'react-i18next'

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderColor: theme.palette.grey[900] + 25,
    [`&.${tableCellClasses.head}`]: {
        color: theme.palette.grey[900]
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14,
        height: 64
    }
}))

const StyledTableRow = styled(TableRow)(() => ({
    '&:last-child td, &:last-child th': { border: 0 }
}))

const getLocalStorageKeyName = (name, isAgentCanvas) => {
    return (isAgentCanvas ? 'agentcanvas' : 'chatflowcanvas') + '_' + name
}

export const FlowListTable = ({
    data, images, isLoading, filterFunction, updateFlowsApi, setError, isAgentCanvas,
    isOpeaCanvas, stopSandboxApi, updateFlowToServerApi, userRole
}) => {
    const { t } = useTranslation()
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    setError = (error) => { console.error(error) }

    const localStorageKeyOrder = getLocalStorageKeyName('order', isAgentCanvas)
    const localStorageKeyOrderBy = getLocalStorageKeyName('orderBy', isAgentCanvas)
    const [order, setOrder] = useState(localStorage.getItem(localStorageKeyOrder) || 'desc')
    const [orderBy, setOrderBy] = useState(localStorage.getItem(localStorageKeyOrderBy) || 'updatedDate')
    const [sortedData, setSortedData] = useState([])

    // 状态国际化
    const sandboxStatusText = (status) => {
        if (status === "Not Running") return t('flowlist.notRunning')
        if (status === "Ready") return t('flowlist.ready')
        if (status === "Getting Ready") return t('flowlist.gettingReady')
        if (status === "Stopping") return t('flowlist.stopping')
        if (status === "Error") return t('flowlist.error')
        return status
    }

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc'
        const newOrder = isAsc ? 'desc' : 'asc'
        setOrder(newOrder)
        setOrderBy(property)
        localStorage.setItem(localStorageKeyOrder, newOrder)
        localStorage.setItem(localStorageKeyOrderBy, property)
    }

    // ---- WebSocket 相关核心逻辑 ----
    useEffect(() => {
        const openConnections = [];
        const openWebSocketConnection = (id, status, type = 'sandbox') => {
            let wsEndpoint = config.sandbox_status_endpoint;
            const ws = new WebSocket(`${config.studio_server_url}/${wsEndpoint}`);
            ws.onopen = () => {
                let payload = JSON.stringify({ id: id, status: status });
                ws.send(payload);
            };
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (['Done', 'Error', 'Not Running', 'Ready'].includes(data.status)) {
                    ws.close();
                    openConnections.splice(openConnections.indexOf(ws), 1);
                    updateSandboxStatus(
                        id, data.status,
                        data.sandbox_app_url,
                        data.sandbox_grafana_url,
                        data.sandbox_tracer_url,
                        data.sandbox_debuglogs_url
                    );
                    if (updateFlowToServerApi) {
                        updateFlowToServerApi(id, {
                            sandboxStatus: data.status,
                            sandboxAppUrl: data.sandbox_app_url,
                            sandboxGrafanaUrl: data.sandbox_grafana_url,
                            sandboxTracerUrl: data.sandbox_tracer_url,
                            sandboxDebugLogsUrl: data.sandbox_debuglogs_url
                        });
                    }
                }
            };
            ws.onclose = () => {};
            return ws;
        };
        // 只监听特殊状态的行
        sortedData.forEach((row) => {
            if (row.sandboxStatus === 'Getting Ready' || row.sandboxStatus === 'Stopping') {
                const ws = openWebSocketConnection(row.id, row.sandboxStatus);
                openConnections.push(ws);
            }
        });
        return () => {
            openConnections.forEach((ws) => { ws.close(); });
        };
        // eslint-disable-next-line
    }, [sortedData]);
    // ---- end WebSocket ----

    // 状态本地更新
    const updateSandboxStatus = (id, newStatus, sandboxAppUrl = null, sandboxGrafanaUrl = null, sandboxTracerUrl = null, sandboxDebugLogsUrl = null) => {
        setSortedData((prevData) =>
            prevData.map((row) =>
                row.id === id
                    ? {
                          ...row,
                          sandboxStatus: newStatus,
                          sandboxAppUrl: sandboxAppUrl || row.sandboxAppUrl,
                          sandboxGrafanaUrl: sandboxGrafanaUrl || row.sandboxGrafanaUrl,
                          sandboxTracerUrl: sandboxTracerUrl || row.sandboxTracerUrl,
                          sandboxDebugLogsUrl: sandboxDebugLogsUrl || row.sandboxDebugLogsUrl
                      }
                    : row
            )
        );
    };

    // 各类操作事件
    const handleRunSandbox = async (id) => {
        updateSandboxStatus(id, 'Sending Request');
        const res = await chatflowsApi.deploySandbox(id)
        updateSandboxStatus(
            id,
            res.data?.sandboxStatus || 'Error',
            res.data?.sandboxAppUrl,
            res.data?.sandboxGrafanaUrl,
            res.data?.sandboxTracerUrl,
            res.data?.sandboxDebugLogsUrl
        );
    }
    const handleStopSandbox = async (id) => {
        updateSandboxStatus(id, 'Sending Request');
        const res = await stopSandboxApi(id)
        try {
            if (res.data?.sandboxStatus) {
                updateSandboxStatus(id, res.data?.sandboxStatus)
            } else {
                throw new Error('Failed to stop sandbox')
            }
        } catch (error) {
            setError(error)
        }
    }

    // 排序
    const handleSortData = () => {
        if (!data) return [];
        const sorted = [...data].map((row) => ({
            ...row,
            sandboxStatus: row.sandboxStatus || 'Not Running'
        })).sort((a, b) => {
            if (orderBy === 'name') {
                return order === 'asc' ? (a.name || '').localeCompare(b.name || '') : (b.name || '').localeCompare(a.name || '')
            } else if (orderBy === 'updatedDate') {
                return order === 'asc'
                    ? new Date(a.updatedDate) - new Date(b.updatedDate)
                    : new Date(b.updatedDate) - new Date(a.updatedDate)
            }
            return 0
        });
        return sorted;
    };
    useEffect(() => { setSortedData(handleSortData()) }, [data, order, orderBy])

    // observability menu
    const [observabilityAnchorEl, setObservabilityAnchorEl] = useState(null);
    const [observabilityRow, setObservabilityRow] = useState(null);
    const handleOpenUrl = (url) => { window.open(url, '_blank'); }

    // Dialog 控制
    const [buildDeploymentPackageDialogOpen, setBuildDeploymentPackageDialogOpen] = useState(false)
    const [buildDeploymentPackageDialogProps, setBuildDeploymentPackageDialogProps] = useState({})
    const [oneClickDeploymentDialogOpen, setOneClickDeploymentDialogOpen] = useState(false)
    const [oneClickDeploymentDialogProps, setOneClickDeploymentDialogProps] = useState({})
    const [deployStatusById, setDeployStatusById] = useState({});
    const [deployConfigById, setDeployConfigById] = useState({});

    return (
        <>
            <TableContainer sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }} component={Paper}>
                <Table sx={{ minWidth: 650 }} size='small' aria-label='a dense table'>
                    <TableHead
                        sx={{
                            backgroundColor: customization.isDarkMode ? theme.palette.common.black : theme.palette.grey[100],
                            height: 56
                        }}
                    >
                        <TableRow>
                            <StyledTableCell>
                                <TableSortLabel active={orderBy === 'name'} direction={order} onClick={() => handleRequestSort('name')}>
                                    {t('flowlist.workflowName')}
                                </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='center'>
                                    {t('flowlist.sandboxStatus')}
                                </Stack>
                            </StyledTableCell>
                            <StyledTableCell>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='center'>
                                    {t('flowlist.sandboxControl')}
                                </Stack>
                            </StyledTableCell>
                            <StyledTableCell>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='center'>
                                    {t('flowlist.openSandbox')}
                                </Stack>
                            </StyledTableCell>
                            <StyledTableCell>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='center'>
                                    {t('flowlist.observability')}
                                </Stack>
                            </StyledTableCell>
                            <StyledTableCell>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='center'>
                                    {t('flowlist.oneClickDeploy')}
                                </Stack>
                            </StyledTableCell>
                            <StyledTableCell>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='center'>
                                    {t('flowlist.actions')}
                                </Stack>
                            </StyledTableCell>
                            <StyledTableCell>
                                <TableSortLabel
                                    active={orderBy === 'updatedDate'}
                                    direction={order}
                                    onClick={() => handleRequestSort('updatedDate')}
                                >
                                    {t('flowlist.lastModified')}
                                </TableSortLabel>
                            </StyledTableCell>
                            {userRole === 'admin' && (
                                <StyledTableCell>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='center'>
                                        {t('flowlist.user')}
                                    </Stack>
                                </StyledTableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <>
                                {[...Array(2)].map((_, idx) => (
                                    <StyledTableRow key={idx}>
                                        {Array(userRole === 'admin' ? 9 : 8).fill(0).map((_, jdx) => (
                                            <StyledTableCell key={jdx}><Skeleton variant='text' /></StyledTableCell>
                                        ))}
                                    </StyledTableRow>
                                ))}
                            </>
                        ) : (
                            sortedData.length === 0 ? (
                                <StyledTableRow>
                                    <StyledTableCell colSpan={userRole === 'admin' ? 9 : 8} align="center">
                                        {t('flowlist.noData')}
                                    </StyledTableCell>
                                </StyledTableRow>
                            ) : (
                                sortedData.filter(filterFunction).map((row, index) => (
                                    <StyledTableRow key={index}>
                                        <StyledTableCell>
                                            <Tooltip title={row.templateName || row.name}>
                                                <Typography sx={{ display: '-webkit-box', fontSize: 14, fontWeight: 500, WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                    <Link to={`/${isAgentCanvas ? 'agentcanvas' : isOpeaCanvas ? 'opeacanvas' : 'canvas'}/${row.id}`} style={{ color: '#1162cc', textDecoration: 'none' }}>
                                                        {row.templateName || row.name}
                                                    </Link>
                                                </Typography>
                                            </Tooltip>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='center' alignItems='center'>
                                                {(row.sandboxStatus === "Getting Ready" || row.sandboxStatus === "Stopping") ? <CircularProgress size={20} /> : null}
                                                <Typography variant="body2">{sandboxStatusText(row.sandboxStatus)}</Typography>
                                            </Stack>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='center' alignItems='center'>
                                                {(row.sandboxStatus === "Ready" || row.sandboxStatus === "Getting Ready") ? (
                                                    <Tooltip title={t('flowlist.stopSandbox')}>
                                                        <Button color='primary' startIcon={<StopCircleOutlined />} onClick={() => handleStopSandbox(row.id)}></Button>
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip title={t('flowlist.openSandbox')}>
                                                        <Button color='primary' startIcon={<PlayCircleOutline />} onClick={() => handleRunSandbox(row.id)} disabled={row.sandboxStatus === 'Stopping'}></Button>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='center' alignItems='center'>
                                                <Tooltip title={row.sandboxStatus === 'Ready' ? t('flowlist.openApp') : t('flowlist.sandboxNotRunning')}>
                                                    <span>
                                                        <Button color={row.sandboxStatus === 'Not Running' ? 'inherit' : 'primary'} startIcon={<OpenInNew />}
                                                            onClick={() => handleOpenUrl(row.sandboxAppUrl)} disabled={row.sandboxStatus !== 'Ready'}></Button>
                                                    </span>
                                                </Tooltip>
                                            </Stack>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='center' alignItems='center'>
                                                <Tooltip title={row.sandboxStatus === 'Ready' ? t('flowlist.observabilityOptions') : t('flowlist.sandboxNotRunning')}>
                                                    <span>
                                                        <Button color={row.sandboxStatus === 'Not Running' ? 'inherit' : 'primary'} startIcon={<TroubleshootOutlined />}
                                                            disabled={row.sandboxStatus !== 'Ready'}
                                                            aria-controls={`observability-menu-${row.id}`}
                                                            aria-haspopup="true"
                                                            onClick={(event) => { setObservabilityAnchorEl(event.currentTarget); setObservabilityRow(row); }}>
                                                        </Button>
                                                    </span>
                                                </Tooltip>
                                                <Menu
                                                    id={`observability-menu-${row.id}`}
                                                    anchorEl={observabilityAnchorEl}
                                                    open={Boolean(observabilityAnchorEl) && observabilityRow?.id === row.id}
                                                    onClose={() => setObservabilityAnchorEl(null)}
                                                >
                                                    <MenuItem onClick={() => { handleOpenUrl(row.sandboxGrafanaUrl); setObservabilityAnchorEl(null); }} disabled={row.sandboxStatus !== 'Ready'}>
                                                        <Analytics fontSize="small" sx={{ mr: 1 }} /> {t('flowlist.monitoringDashboard')}
                                                    </MenuItem>
                                                    <MenuItem onClick={() => { handleOpenUrl(row.sandboxTracerUrl); setObservabilityAnchorEl(null); }} disabled={row.sandboxStatus !== 'Ready'}>
                                                        <ViewTimelineOutlined fontSize="small" sx={{ mr: 1, transform: 'scaleX(-1)' }} /> {t('flowlist.llmTraces')}
                                                    </MenuItem>
                                                    <MenuItem onClick={() => { handleOpenUrl(row.sandboxDebugLogsUrl); setObservabilityAnchorEl(null); }} disabled={row.sandboxStatus !== 'Ready'}>
                                                        <TerminalOutlined fontSize="small" sx={{ mr: 1 }} /> {t('flowlist.debugLogs')}
                                                    </MenuItem>
                                                </Menu>
                                            </Stack>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='center' alignItems='center'>
                                                <Tooltip title={t('flowlist.oneClickDeploy')}>
                                                    <span>
                                                        <Button startIcon={<InstallDesktopOutlined />} onClick={() => { /* handleOneClickDeployment(row.id); */ }}></Button>
                                                    </span>
                                                </Tooltip>
                                            </Stack>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <FlowListMenu
                                                isAgentCanvas={isAgentCanvas}
                                                chatflow={row}
                                                setError={setError}
                                                updateFlowsApi={updateFlowsApi}
                                                sandboxStatus={row.sandboxStatus}
                                            />
                                        </StyledTableCell>
                                        <StyledTableCell>{moment(row.updatedDate).format('YYYY-MM-DD HH:mm:ss')}</StyledTableCell>
                                        {userRole === 'admin' && <StyledTableCell>{row.userid}</StyledTableCell>}
                                    </StyledTableRow>
                                ))
                            )
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <BuildDeploymentPackageDialog
                show={buildDeploymentPackageDialogOpen}
                dialogProps={buildDeploymentPackageDialogProps}
                onCancel={() => setBuildDeploymentPackageDialogOpen(false)}
                onConfirm={() => {}}
            />
            <OneClickDeploymentDialog
                key={oneClickDeploymentDialogProps.id || 'none'}
                show={oneClickDeploymentDialogOpen}
                dialogProps={oneClickDeploymentDialogProps}
                onCancel={() => setOneClickDeploymentDialogOpen(false)}
                onConfirm={() => {}}
                deployStatus={deployStatusById[oneClickDeploymentDialogProps.id]}
                setDeployStatus={() => {}}
                deploymentConfig={deployConfigById[oneClickDeploymentDialogProps.id] || { hostname: '', username: '' }}
                setDeploymentConfig={() => {}}
            />
        </>
    )
}

FlowListTable.propTypes = {
    data: PropTypes.array,
    images: PropTypes.object,
    isLoading: PropTypes.bool,
    filterFunction: PropTypes.func,
    updateFlowsApi: PropTypes.object,
    setError: PropTypes.func,
    isAgentCanvas: PropTypes.bool,
    isOpeaCanvas: PropTypes.bool,
    stopSandboxApi: PropTypes.func,
    updateFlowToServerApi: PropTypes.func,
    userRole: PropTypes.string
}

export default FlowListTable
