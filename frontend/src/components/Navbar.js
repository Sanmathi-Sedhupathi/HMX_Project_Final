import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Stack,
  useColorModeValue,
  useDisclosure,
  IconButton,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
} from '@chakra-ui/react';
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import axios from 'axios';

const NavLink = ({ children, to }) => (
  <RouterLink to={to}>
    <Text
      px={2}
      py={1}
      rounded={'md'}
      _hover={{
        textDecoration: 'none',
        bg: useColorModeValue('gray.200', 'gray.700'),
      }}
    >
      {children}
    </Text>
  </RouterLink>
);

const Navbar = () => {
  const { isOpen, onToggle } = useDisclosure();
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          console.error('Error checking auth status:', error);
          localStorage.removeItem('token');
          setUser(null);
        }
      }
    };
    
    checkAuth();
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };
  
  return (
    <Box>
      <Flex
        bg={useColorModeValue('white', 'gray.800')}
        color={useColorModeValue('gray.600', 'white')}
        minH={'60px'}
        py={{ base: 2 }}
        px={{ base: 4 }}
        borderBottom={1}
        borderStyle={'solid'}
        borderColor={useColorModeValue('gray.200', 'gray.900')}
        align={'center'}
      >
        <Flex
          flex={{ base: 1, md: 'auto' }}
          ml={{ base: -2 }}
          display={{ base: 'flex', md: 'none' }}
        >
          <IconButton
            onClick={onToggle}
            icon={isOpen ? <CloseIcon w={3} h={3} /> : <HamburgerIcon w={5} h={5} />}
            variant={'ghost'}
            aria-label={'Toggle Navigation'}
          />
        </Flex>
        
        <Flex flex={{ base: 1 }} justify={{ base: 'center', md: 'start' }}>
          <RouterLink to="/">
            <Text
              textAlign={useColorModeValue('left', 'center')}
              fontFamily={'heading'}
              color={useColorModeValue('gray.800', 'white')}
              fontWeight="bold"
              fontSize="xl"
            >
              HMX
            </Text>
          </RouterLink>

          <Flex display={{ base: 'none', md: 'flex' }} ml={10}>
            <Stack direction={'row'} spacing={4}>
              {user && (
                <>
                  <NavLink to="/">Dashboard</NavLink>
                </>
              )}
            </Stack>
          </Flex>
        </Flex>

        <Stack
          flex={{ base: 1, md: 0 }}
          justify={'flex-end'}
          direction={'row'}
          spacing={6}
        >
          {user ? (
            <Menu>
              <MenuButton
                as={Button}
                rounded={'full'}
                variant={'link'}
                cursor={'pointer'}
                minW={0}
              >
                <Avatar
                  size={'sm'}
                  name={user.contact_name || user.email}
                />
              </MenuButton>
              <MenuList>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <HStack spacing={4}>
              <Button
                as={RouterLink}
                to="/login"
                fontSize={'sm'}
                fontWeight={400}
                variant={'link'}
              >
                Sign In
              </Button>
              <Button
                as={RouterLink}
                to="/register"
                display={{ base: 'none', md: 'inline-flex' }}
                fontSize={'sm'}
                fontWeight={600}
                color={'white'}
                bg={'blue.400'}
                _hover={{
                  bg: 'blue.300',
                }}
              >
                Sign Up
              </Button>
            </HStack>
          )}
        </Stack>
      </Flex>

      {/* Mobile menu */}
      <Box
        display={{ base: isOpen ? 'block' : 'none', md: 'none' }}
        pb={4}
        px={4}
      >
        <Stack as={'nav'} spacing={4}>
          {user && (
            <>
              <NavLink to="/">Dashboard</NavLink>
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
};

export default Navbar; 